/* eslint-disable no-undef */
/* eslint-disable no-console */
const parser = require('@babel/parser');

const getAst = (code, config = {}) => {
  const defaultConfig = {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'decorators-legacy', 'classProperties', 'objectRestSpread'],
  }

  return parser.parse(code, Object.assign(defaultConfig, config));
};

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

const cleanupTree = route => {
  let newRoute = Object.assign({}, route);

  if (newRoute.parent) {
    newRoute.parent = '...';
  }
  if (newRoute.next) {
    newRoute.next = '...';
  }
  if (newRoute.prev) {
    newRoute.prev = '...';
  }

  if (newRoute.routes) {
    newRoute.routes = newRoute.routes.map( route => {
      return cleanupTree(route);
    })
  }

  return newRoute;
}

module.exports = {
  getAst,
  cleanupState,
  cleanupTree,
}