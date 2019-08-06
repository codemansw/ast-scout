/* eslint-disable no-undef */
/* eslint-disable no-console */
// const generate = require('@babel/generator').default;
const parser = require('@babel/parser');
// const traverse = require('@babel/traverse').default;

const getAst = (code, config = {}) => {
  const defaultConfig = {
      sourceType: 'module',
      plugins: ['jsx', 'decorators-legacy', 'classProperties', 'objectRestSpread'],
  }

  return parser.parse(code, Object.assign(defaultConfig, config));
};

const cleanupState = state => state.map( route => {
    // delete path.parent;
    // delete path.pathRef;
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