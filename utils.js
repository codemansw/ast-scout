/* eslint-disable no-undef */
/* eslint-disable no-console */
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const isString = require("lodash/isString");
const isObject = require("lodash/isObject");
const isBoolean = require("lodash/isBoolean");
const isNumber = require("lodash/isNumber");
const isArray = require("lodash/isArray");
const has = require("lodash/has");

const pathOpts = [
  'inList',
  'listKey',
  'key',
  'parentKey',
];

getPathProfile = path => {
  const profile = {
  }

  pathOpts.reduce( (previousValue, key) => {
    previousValue[key] = checkValue(path[key]);

    return previousValue;
  }, profile);

  profile.node = {
    type: path.node.type,
  }

  t.BUILDER_KEYS[path.node.type].reduce( (previousValue, key) => {
    previousValue[key] = checkValue(path.node[key]);

    return previousValue;
  }, profile.node);

  profile.nodeIsDeclaration = t.isDeclaration(path.node);

  return profile;
}

checkValue = value => {
  if (isString(value) || isNumber(value) || isBoolean(value)) {
    return value;
  } else if (isArray(value)) {
    return 'array';
  } else if (isObject(value)) {
    return 'object';
  }

  return value;
}

scoutSkipKeys = [
  'next',
  'prev',
  'parent',
  'indexPath',
]

nodeAdditionalKeys = [
  'start',
  'end',
]

const matchScout = (path, scout) => {
  // check path:
  const match = Object.keys(scout).reduce( (previousValue, key) => {
    if (isString(scout[key]) && !scoutSkipKeys.includes(key)) { // limit to path key & string values
      previousValue = previousValue && checkValue(path[key]) === scout[key];
    }

    return previousValue;
  }, true);

  // check path.node:
  return Object.keys(scout.node).reduce( (previousValue, key) => {
    if (isString(scout.node[key])) { // limit to path.node key & string values
      previousValue = previousValue && checkValue(path.node[key]) === scout.node[key];
    }

    return previousValue;
  }, match);
}

const createState = ({
  path,
  visitorObject,
  parent,
  scout
}) => {
  const state = {
    type: path.node.type,
    scoutIndexPath: scout.indexPath,
    // scoutDone: Object.keys(visitorObject).length === 0,
    scoutDone: false,
    node: {},
    parent,
  };

  pathOpts.forEach( key => {
    state[key] = checkValue(path[key]);
  });

  Object.keys(scout.node).forEach( key => {
    state.node[key] = checkValue(path.node[key]);
  });

  nodeAdditionalKeys.forEach( key => {
    state.node[key] = checkValue(path.node[key]);
  })
  
  // state.node.isDeclaration = t.isDeclaration(path.node);

  return state;
}

const visitorFunctionFactory = visitorObject => {
  return function(path) {
    let match = false;
    let scout = this.scoutTree;
    let next = false;

    do {
      next = false;
      match = matchScout(path, scout);

      if (!match && scout.next) {
        // console.log('next');
        next = true;
        scout = scout.next;
      }
    } while(!match && next);

    if (match) {
      // console.log('match', path.node.type, scout.indexPath);
      const newState = createState({
        path,
        visitorObject,
        parent: this.parent,
        scout
      });

      // console.log(Object.keys(visitorObject).length);

      if (Object.keys(visitorObject).length) {
        const newScout = scout.paths ? scout.paths[0] : null;
        const newPaths = [];

        // console.log(newScout ? newScout.indexPath : 'null', Object.keys(visitorObject));

        path.traverse(visitorObject, {
          scoutTree: newScout,
          state: newPaths,
          parent: newState,
        });

        if (newPaths.length) {
          newState.paths = newState.paths ? newState.paths.push(...newPaths) : [...newPaths];
        }
      }

      // console.log(`${scout && scout.paths ? scout.paths.length : '-'}:${newState && newState.paths ? newState.paths.length : '-'}`);
      // this.state.push(newState);

      if ((
        !newState.paths &&
        !scout.paths
      ) || (
        has(scout, 'paths.length') &&
        has(newState, 'paths.length') &&
        scout.paths.length === newState.paths.filter( path => path.scoutDone ).length
      )) {
        this.state.push(newState);
        newState.scoutDone = true;
        path.skip();
      }

    }    
  }
}

function createVisitorObject(scoutTree) {
  let scoutRefs = scoutTree && scoutTree.paths && scoutTree.paths.length ? scoutTree.paths : [];

  if (scoutRefs.length === 0) {
    return {}
  }

  const visitor = {};
  
  scoutRefs.forEach( scout => {
    const visitorObject = createVisitorObject(scout);

    if (!visitor[scout.node.type]) {
      visitor[scout.node.type] = visitorFunctionFactory(visitorObject);
    }
  });

  return visitor;
}

const decorateTreeWithSiblingNavigation = (scoutTree) => {
  scoutTree.indexPath = scoutTree.indexPath || '0';

  if (scoutTree.paths) {
    scoutTree.paths.map( (path, index) => {
      path.indexPath = `${scoutTree.indexPath}.${index}`;
      if (scoutTree.paths.length > index + 1) {
        path.next = scoutTree.paths[index + 1];
      }
      if (index < scoutTree.paths.length + 1) {
        path.prev = scoutTree.paths[index - 1];
      }

      return decorateTreeWithSiblingNavigation(path);
    });
  };

  return scoutTree;
}

const cleanupState = state => state.map( path => {
    delete path.parent;
    
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
  getPathProfile,
  createVisitorObject,
  decorateTreeWithSiblingNavigation,
  cleanupState,
  cleanupTree,
}