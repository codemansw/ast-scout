const decorateTreeWithSiblingNavigationAndIndex = (route) => {
  route.index = route.index || '0';

  if (route.routes) {
    route.routes.map( (subRoute, index) => {
      subRoute.index = `${route.index}.${index}`;
      if (route.routes.length > index + 1) {
        subRoute.next = route.routes[index + 1];
      }
      if (index > 0) {
        subRoute.prev = route.routes[index - 1];
      }

      return decorateTreeWithSiblingNavigationAndIndex(subRoute);
    });
  };

  return route;
}

const groom = (route, startType) => {
  // remove top container node (first node) from scoutTree
  // for any type but "*Declaration" or when startType matchPaths the first node type
  // and remove any references to the container node
  if (
    route &&
    route.routes &&
    route.routes.length &&
    route.routes[0].routes &&
    route.routes[0].routes.length
  ) {
    const hasSubRoutes = route.routes[0].routes;
    const nodeIsDeclaration = route.routes[0].nodeIsDeclaration === true;
    const firstSubRouteIsOfStartType = startType && route.routes[0].node.type === startType;
    if (
      hasSubRoutes &&
      !nodeIsDeclaration &&
      !firstSubRouteIsOfStartType
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

module.exports = {
  decorateTreeWithSiblingNavigationAndIndex,
  groom,
}