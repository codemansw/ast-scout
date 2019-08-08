const has = require("lodash/has");

const relayStartRoute = (route, startType) => {
  if (!route || !route.routes) {
    return null;
  }

  const startRoutes = [];

  route.routes.forEach(subRoute => {
    if (subRoute.node && subRoute.node.type === startType) {
      startRoutes.push(subRoute);

    } else {
      if (!startRoutes.length) {
        const deepRoute = relayStartRoute(subRoute, startType);
  
        if (deepRoute) {
          startRoutes.push(deepRoute);
        }
      }
    }
  });

  if (startRoutes.length) {
    return startRoutes[0]; // first matching path gets all
    
  } else {
    return null;
  }
};

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
