const has = require("lodash/has");

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
    return route; //no matchPaths at sub levels of the tree
  }
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

module.exports = {
  relayStartRoute,
  collectSearchRoutes,
  collectMatchRoutes,
  deDuplicateRoutes,
}
