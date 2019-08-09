const cleanupState = state => state.map( route => {
  if (route.parent) {
    route.parent = '...'
  }
  if (route.pathRef) {
    route.pathRef = '...'
  }
  
  if (route.routes) {
    route.routes = cleanupState(route.routes);
  }

  return route;
}
);

module.exports = {
  cleanupState,
}