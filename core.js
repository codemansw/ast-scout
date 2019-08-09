/* eslint-disable no-undef */
/* eslint-disable no-console */
// const t = require('@babel/types');
const has = require("lodash/has");
// const isNumber = require("lodash/isNumber");
// const isString = require("lodash/isString");
// const isObject = require("lodash/isObject");
// const isBoolean = require("lodash/isBoolean");
// const isArray = require("lodash/isArray");
// const isUndefined = require("lodash/isUndefined");

// const { PATH_OPTS, ROUTE_SKIP_KEYS, NODE_ADDITIONAL_KEYS } = require('./constants');
const {
  // findScoutMatch,
  // checkValue,
  matchRoute,
  createState,
} = require('./utils/match');
// const { SCOUT_DEBUG = 'false' } = process.env;

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
  createVisitorObject,
}
