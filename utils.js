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

const cleanupState = state => state.map( path => {
    // delete path.parent;
    // delete path.pathRef;
    if (path.parent) {
      path.parent = '...cleaned up'
    }
    if (path.pathRef) {
      path.pathRef = '...cleaned up'
    }
    
    if (path.paths) {
      path.paths = cleanupState(path.paths);
    }

    return path;
  }
);

const cleanupTree = path => {
  let newPath = Object.assign({}, path);

  if (newPath.parent) {
    newPath.parent = '...';
  }
  if (newPath.next) {
    newPath.next = '...';
  }
  if (newPath.prev) {
    newPath.prev = '...';
  }

  if (newPath.paths) {
    newPath.paths = newPath.paths.map( path => {
      return cleanupTree(path);
    })
  }

  return newPath;
}

module.exports = {
  getAst,
  getPathProfile,
  cleanupState,
  cleanupTree,
}