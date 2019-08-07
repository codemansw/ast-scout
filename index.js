const traverse = require('@babel/traverse').default;
const isObject = require("lodash/isObject");
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
    route.routes.map( (subRoute, index) => {
      subRoute.index = `${route.index}.${index}`;
      if (route.routes.length > index + 1) {
        subRoute.next = route.routes[index + 1];
      }
      if (index < route.routes.length + 1) {
        subRoute.prev = route.routes[index - 1];
      }

      return decorateTreeWithSiblingNavigation(subRoute);
    });
  };

  return route;
}

const groom = (route, startType) => {
  // remove top container node (first node) from scoutTree
  // for any type but "*Declaration" or when startType matches the first node type
  // and remove any references to the container node
  if (
    route &&
    route.routes &&
    route.routes.length &&
    route.routes[0].routes &&
    route.routes[0].routes.length
  ) {
    if (
      route.routes[0].nodeIsDeclaration === false &&
      !startType && !route.routes[0].node && route.routes[0].node.type !== startType
    ) {
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

const relayStartRoute = (route, startType) => {
  if (!route.routes) {
    return route;
  }

  let startRoutes = route.routes.reduce( (previousValue, subRoute) => {
    if (subRoute.node && subRoute.node.type === startType) {
      previousValue.push(subRoute);
    }

    return previousValue;
  }, []);

  if (startRoutes.length) {
    return startRoutes[0]; // first matching path gets all
  }

  startRoutes = route.routes.reduce( (previousValue, subRoute) => {
    previousValue.push(relayStartRoute(subRoute, startType));

    return previousValue;
  }, []);

  if (startRoutes.length) {
    return startRoutes[0]; // first matching path gets all
    
  } else {
    return route; //no matches at sub levels of the tree
  }
}

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

  if (isObject(scoutSearch)) {
    const route = relayStartRoute(routeTree, scoutSearch.startType);

    routeTree = {
      routes: []
    };

    if (route) {
      routeTree.routes.push(route);
    }
  }

  routeTree = groom(routeTree, scoutSearch.startType); // cleanup root node from parent or container details
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

const collectSearchRoutes = routes => {
  return routes.reduce( (previousValue, route) => {
    if (route.scout && route.scout.done && route.pathRef) {
      previousValue.push(route.pathRef);
    }

    return previousValue;
  }, []);  
}

const collectMatchRoutes = routes => {
  return routes.reduce( (previousValue, route) => {
    if (route.scout && route.scout.done && route.scout.marked && route.pathRef) {
      previousValue.push(route.pathRef);
    }

    if (route.routes) {
      previousValue.push( ...collectMatchRoutes(route.routes));
    }

    return previousValue;
  }, []);  
}

const deDuplicateRoutes = (previousValue, route) => {
  if (
    has(route, 'node.start') &&
    has(route, 'node.end') &&
    previousValue.filter( pathInList => {
      return (
        route.node.start === pathInList.node.start &&
        route.node.end === pathInList.node.end
      )
    }).length === 0
  ) {
    previousValue.push(route);
  }

  return previousValue;
}

const findPaths = (path, scout, babelConfig) => {
  const { scoutVisitorObject, stateObject } = createVisitorFromScout(scout, babelConfig);

  path.traverse(scoutVisitorObject, stateObject);

  if (SCOUT_DEBUG === 'true') {
    console.log('state:\n', JSON.stringify(cleanupState(cloneDeep(stateObject.state)), decycle(), 2));
  }

  const pathsObject = {
    searches: [],
    matches: []
  }

  if (has(stateObject, 'state.length')) {
    pathsObject.searches = collectSearchRoutes(stateObject.state);
    pathsObject.matches = collectMatchRoutes(stateObject.state).reduce(deDuplicateRoutes, []);
  }

  return pathsObject;
}

module.exports = {
  findPaths
};
