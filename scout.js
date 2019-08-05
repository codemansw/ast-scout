// const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
// const generate = require('@babel/generator').default;
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

const groomScoutTree = tree => {
  // remove top container node (first node) from scoutTree
  // for any type but "*Declaration"
  // and remove any references to the container node
  if (
    tree &&
    tree.paths &&
    tree.paths.length &&
    tree.paths[0].paths &&
    tree.paths[0].paths.length
  ) {
    if (tree.paths[0].nodeIsDeclaration === false) {
      tree = {
        paths: tree.paths[0].paths
      };
    }
    delete tree.paths[0].parent;
    delete tree.paths[0].inList;
    delete tree.paths[0].listKey;
    delete tree.paths[0].key;
    delete tree.paths[0].parentKey;
  
  } else {
    tree = {};
  }

  return tree;
}

const createVisitorFromScout = scout => {
  if (SCOUT_DEBUG === 'true') {
    console.log(`scout:', ${JSON.stringify(scout, null, 2)}`);
  }
  // todo scout validation .....
  const skipNodes = [
    'Program'
  ];
  const scoutSearch = isString(scout) ? scout : scout.search;
  const scoutAst = getAst(scoutSearch);

  let scoutTree = {};
  let pathRef = scoutTree;

  // build node structure from provided scout
  traverse(scoutAst, {
    enter(path) {
      if (!skipNodes.includes(path.node.type)) {
        const pathProfile = Object.assign(buildPathProfile(path, scout), { parent: pathRef });

        pathRef.paths = pathRef.paths || [];
        pathRef.paths.push(pathProfile);
        pathRef = pathRef.paths[pathRef.paths.length -1];
      }
    },
    exit(path) {
      if (!skipNodes.includes(path.node.type)) {
        pathRef = pathRef.parent;
      }
    }
  });

  scoutTree = groomScoutTree(scoutTree); // cleanup root node from parent or container details
  scoutTree = decorateTreeWithSiblingNavigation(scoutTree); // add next/prev to path siblings
  pathRef = scoutTree && scoutTree.paths && scoutTree.paths.length ? scoutTree.paths[0] : null;

  if (SCOUT_DEBUG === 'true') {
    console.log('scoutTree:\n', JSON.stringify(cleanupTree(scoutTree), decycle(), 2));
  }
  
  return {
    scoutVisitorObject: createVisitorObject(scoutTree),
    stateObject: {
      scoutTree: pathRef,
      state: [],
      parent: null
    }
  };
}

const findPaths = (path, scout) => {
  const { scoutVisitorObject, stateObject } = createVisitorFromScout(scout);

  path.traverse(scoutVisitorObject, stateObject);

  if (SCOUT_DEBUG === 'true') {
    console.log('state:\n', JSON.stringify(cleanupState(cloneDeep(stateObject.state)), decycle(), 2));
  }

  if (has(stateObject, 'state.length')) {
    return stateObject.state.reduce( (previousValue, path) => {
      if (path.scoutDone && path.pathRef) {
        previousValue.push(path.pathRef)
      }

      return previousValue;
    }, [])
  }
}

module.exports = {
  createVisitorFromScout,
  findPaths
}