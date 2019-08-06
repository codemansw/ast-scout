// const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
// const generate = require('@babel/generator').default;
const has = require("lodash/has");
const cloneDeep = require("lodash/cloneDeep");

const isString = require("lodash/isString");
const decycle = require('json-decycle').decycle;

const { createVisitorObject, buildPathProfile } = require('./core');
const {
  getAst,
  cleanupState,
  cleanupTree,
} = require('./utils');
const { SCOUT_DEBUG = 'false' } = process.env;

const decorateTreeWithSiblingNavigation = (route) => {
  route.index = route.index || '0';

  if (route.routes) {
    route.routes.map( (path, index) => {
      path.index = `${route.index}.${index}`;
      if (route.routes.length > index + 1) {
        path.next = route.routes[index + 1];
      }
      if (index < route.routes.length + 1) {
        path.prev = route.routes[index - 1];
      }

      return decorateTreeWithSiblingNavigation(path);
    });
  };

  return route;
}

const groom = route => {
  // remove top container node (first node) from scoutTree
  // for any type but "*Declaration"
  // and remove any references to the container node
  if (
    route &&
    route.routes &&
    route.routes.length &&
    route.routes[0].routes &&
    route.routes[0].routes.length
  ) {
    if (route.routes[0].nodeIsDeclaration === false) {
      route = {
        routes: route.routes[0].routes
      };
    }
    delete route.routes[0].parent;
    delete route.routes[0].inList;
    delete route.routes[0].listKey;
    delete route.routes[0].key;
    delete route.routes[0].parentKey;
  
  } else {
    route = {};
  }

  return route;
}

const createVisitorFromScout = scout => {
  if (SCOUT_DEBUG === 'true') {
    console.log(`scout:', ${JSON.stringify(scout, null, 2)}`);
  }
  // todo scout validation .....
  const skipNodes = [
    'Program'
  ];
  const scoutSearch = isString(scout) ? scout : scout.search;
  const scoutAst = getAst(scoutSearch);

  let routeTree = {};
  let route = routeTree;

  // build node structure from provided scout
  traverse(scoutAst, {
    enter(path) {
      if (!skipNodes.includes(path.node.type)) {
        const pathProfile = Object.assign(buildPathProfile(path, scout), { parent: route });

        route.routes = route.routes || [];
        route.routes.push(pathProfile);
        route = route.routes[route.routes.length -1];
      }
    },
    exit(path) {
      if (!skipNodes.includes(path.node.type)) {
        route = route.parent;
      }
    }
  });

  routeTree = groom(routeTree); // cleanup root node from parent or container details
  routeTree = decorateTreeWithSiblingNavigation(routeTree); // add next/prev to path siblings
  route = routeTree && routeTree.routes && routeTree.routes.length ? routeTree.routes[0] : null;

  if (SCOUT_DEBUG === 'true') {
    console.log('routeTree:\n', JSON.stringify(cleanupTree(routeTree), decycle(), 2));
  }
  
  return {
    scoutVisitorObject: createVisitorObject(routeTree),
    stateObject: {
      route,
      state: [],
      parent: null
    }
  };
}

const collectSearchPreys = routes => {
  return routes.reduce( (previousValue, route) => {
    if (route.scout && route.scout.done && route.pathRef) {
      previousValue.push(route.pathRef);
    }

    return previousValue;
  }, []);  
}

const collectMatchPreys = routes => {
  return routes.reduce( (previousValue, route) => {
    if (route.scout && route.scout.done && route.scout.marked && route.pathRef) {
      previousValue.push(route.pathRef);
    }

    if (route.routes) {
      previousValue.push( ...collectMatchPreys(route.routes));
    }

    return previousValue;
  }, []);  
}

const deDuplicatePreys = (previousValue, route) => {
  if (
    has(route, 'node.start') &&
    has(route, 'node.end') &&
    previousValue.filter( pathInList => route.node.start === pathInList.node.start &&
      route.node.end === pathInList.node.end).length === 0  
  ) {
    previousValue.push(route);
  }

  return previousValue;
}

const findPaths = (path, scout) => {
  const { scoutVisitorObject, stateObject } = createVisitorFromScout(scout);

  path.traverse(scoutVisitorObject, stateObject);

  if (SCOUT_DEBUG === 'true') {
    console.log('state:\n', JSON.stringify(cleanupState(cloneDeep(stateObject.state)), decycle(), 2));
  }

  const pathsObject = {
    searches: [],
    matches: []
  }

  if (has(stateObject, 'state.length')) {
    pathsObject.searches = collectSearchPreys(stateObject.state);
    pathsObject.matches = collectMatchPreys(stateObject.state).reduce(deDuplicatePreys, []);
  }

  return pathsObject;
}

module.exports = {
  createVisitorFromScout,
  findPaths
}