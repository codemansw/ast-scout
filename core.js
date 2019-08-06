/* eslint-disable no-undef */
/* eslint-disable no-console */
const t = require('@babel/types');
const has = require("lodash/has");
const isNumber = require("lodash/isNumber");
const isString = require("lodash/isString");
const isObject = require("lodash/isObject");
const isBoolean = require("lodash/isBoolean");
const isArray = require("lodash/isArray");
const isUndefined = require("lodash/isUndefined");
const { PATH_OPTS, ROUTE_SKIP_KEYS, NODE_ADDITIONAL_KEYS } = require('./constants');
const { SCOUT_DEBUG = 'false' } = process.env;

checkValue = (value, key) => {
  if (isString(value) || isNumber(value) || isBoolean(value)) {
    return value;
  } else if (isArray(value)) {
    return 'array';
  } else if (isObject(value)) {
    return 'object';
  } else if (isUndefined(value)) {
    return value;
  } else {
    console.warn(`core.checkValue: uncovered key:'${key}', value:'${value}'`);
  }

  return value;
}

const findScoutMatch = (scout, key, value) => {
  if (!scout || !scout.matches || !scout.matches.length) {
    return null;
  }

  const result = scout.matches.filter( match => value === match.search);

  return result.length ? Object.assign({ key }, result[0]) : null;
}

buildPathProfile = (path, scout) => {
  const profile = {};
  let match;

  PATH_OPTS.reduce( (previousValue, key) => {
    previousValue[key] = checkValue(path[key], key);

    return previousValue;
  }, profile);

  profile.node = {
    type: path.node.type,
  }

  t.BUILDER_KEYS[path.node.type].reduce( (previousValue, key) => {
    previousValue[key] = checkValue(path.node[key], key);

    if (match = findScoutMatch(scout, key, path.node[key])) {
      profile.match = match;
    }

    return previousValue;
  }, profile.node);

  profile.nodeIsDeclaration = t.isDeclaration(path.node);

  return profile;
}

const checkMatch = (match, value, key) => {
  if (!match || key === 'type') {
    return false; //skip
  }

  if (key !== match.key) {
    return false; //skip
  }

  if (match.regExpr.test(value)) {
    return true;
  }

  return false;
}

const matchRoute = (path, route) => {
  // check path:
  let match = Object.keys(route).reduce( (previousValue, key) => {
    if (isString(route[key]) && !ROUTE_SKIP_KEYS.includes(key)) { // limit to path key & string values
      previousValue = checkValue(path[key], key) === route[key];
    }

    return previousValue;
  }, true);

  let scoutMatch = false; //indicates matching one of the scout defined matches
  let routeMarked = false; //add marking for later paths resolving

  // check path.node:
  match = Object.keys(route.node).reduce( (previousValue, key) => {
    if (isString(route.node[key])) { // limit to path.node key & string values
      const valueCheck = checkValue(path.node[key], key) === route.node[key];
      const matchCheck = checkMatch(route.match, path.node[key], key);

      scoutMatch = scoutMatch || matchCheck;
      routeMarked = routeMarked || (route.match && route.match.marked && scoutMatch);

      previousValue = previousValue && (valueCheck || matchCheck);
    }

    return previousValue;
  }, match);

  return {
    match,
    routeMarked
  }
}

const createState = ({
  path,
  parent,
  route,
  routeMarked,
}) => {
  const state = {
    type: path.node.type,
    node: {},
    scout: {
      index: route.index,
      done: false,
    },
    pathRef: path,
    parent,
  };

  PATH_OPTS.forEach( key => {
    state[key] = checkValue(path[key], key);
  });

  Object.keys(route.node).forEach( key => {
    state.node[key] = checkValue(path.node[key], key);
  });

  NODE_ADDITIONAL_KEYS.forEach( key => {
    state.node[key] = checkValue(path.node[key], key);
  })
  
  if (routeMarked) {
    state.scout.marked = routeMarked;
  }

  return state;
}

const visitorFunctionFactory = visitorObject => {
  return function(path) {
    let match = false;
    let routeMarked = false;
    let route = this.route;
    let next = false;

    do {
      next = false;

      const result = matchRoute(path, route);

      match = result.match;
      routeMarked = result.routeMarked;

      if (!match && route.next) {
        next = true;
        route = route.next;
      }
    } while(!match && next);

    if (match) {
      const newState = createState({
        path,
        visitorObject,
        parent: this.parent,
        route,
        routeMarked,
      });

      if (Object.keys(visitorObject).length) {
        const newScout = route.routes ? route.routes[0] : null;
        const newPreys = [];

        path.traverse(visitorObject, {
          route: newScout,
          state: newPreys,
          parent: newState,
        });

        if (newPreys.length) {
          newState.routes = newState.routes ? newState.routes.push(...newPreys) : [...newPreys];
        }
      }

      if (
        (
          !newState.routes &&
          !route.routes
        ) || 
        (
          has(route, 'routes.length') &&
          has(newState, 'routes.length') &&
          route.routes.length === newState.routes.filter( path => path.scout.done ).length
        )
      ) {
        this.state.push(newState);
        newState.scout.done = true;
        path.skip(); //skip traversing the children of the current path
      }

    }    
  }
}

function createVisitorObject(routeTree) {
  let routes = routeTree && routeTree.routes && routeTree.routes.length ? routeTree.routes : [];

  if (routes.length === 0) {
    return {}
  }

  const visitor = {};
  
  routes.forEach( route => {
    const visitorObject = createVisitorObject(route);

    if (!visitor[route.node.type]) {
      visitor[route.node.type] = visitorFunctionFactory(visitorObject);
    }
  });

  return visitor;
}

module.exports = {
  buildPathProfile,
  visitorFunctionFactory,
  createVisitorObject,
}
