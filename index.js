const traverse = require('@babel/traverse').default;
const isObject = require("lodash/isObject");
const has = require("lodash/has");
const cloneDeep = require("lodash/cloneDeep");

const isString = require("lodash/isString");
const decycle = require('json-decycle').decycle;

const { SCOUT_DEBUG = 'false' } = process.env;
const { createVisitorObject, buildPathProfile } = require('./core');
const { 
  decorateTreeWithSiblingNavigationAndIndex,
  groom,
} = require('./utils/tree');
const {
  relayStartRoute,
  collectSearchRoutes,
  collectMatchRoutes,
  deDuplicateRouteReducer,
} = require('./utils/route');
const {
  getAst,
  cleanupState,
  cleanupTree,
} = require('./utils');

const createVisitorFromScout = (scout, babelConfig) => {
  // todo scout validation .....
  if (SCOUT_DEBUG === 'true') {
    console.log(`scout:', ${JSON.stringify(scout, null, 2)}`);
  }
  const skipNodes = [
    'Program'
  ];
  const scoutSearch = isString(scout) ? scout : scout.search;
  const searchCode = isString(scoutSearch) ? scoutSearch : scoutSearch.context;
  // todo: consider using babelParser.parseExpression, see https://babeljs.io/docs/en/babel-parser
  const scoutAst = getAst(searchCode, babelConfig);

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

  if (SCOUT_DEBUG === 'true') {
    console.log('scoutSearch.startType', scoutSearch.startType);
    console.log('routeTree:\n', JSON.stringify(cleanupTree(routeTree), decycle(), 2));
  }

  if (isObject(scoutSearch)) {
    const route = relayStartRoute(routeTree, scoutSearch.startType) || route;

    routeTree = {
      routes: []
    };

    if (route) {
      routeTree.routes.push(route);
    }
  }

  routeTree = groom(routeTree, scoutSearch.startType); // cleanup root node from parent or container details
  routeTree = decorateTreeWithSiblingNavigationAndIndex(routeTree); // add next/prev to path siblings
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

const findPaths = (path, scout, babelConfig) => {
  const { scoutVisitorObject, stateObject } = createVisitorFromScout(scout, babelConfig);

  path.traverse(scoutVisitorObject, stateObject);

  if (SCOUT_DEBUG === 'true') {
    console.log('state:\n', JSON.stringify(cleanupState(cloneDeep(stateObject.state)), decycle(), 2));
  }

  const pathsObject = {
    searchPaths: [],
    matchPaths: []
  }

  if (has(stateObject, 'state.length')) {
    pathsObject.searchPaths = collectSearchRoutes(stateObject.state);
    pathsObject.matchPaths = collectMatchRoutes(stateObject.state).reduce(deDuplicateRouteReducer, []);
  }

  return pathsObject;
}

module.exports = {
  findPaths
};
