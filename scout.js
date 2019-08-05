// const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
// const generate = require('@babel/generator').default;
const has = require("lodash/has");

const { createVisitorObject } = require('./core');
const {
  getAst,
  getPathProfile,
  cleanupState,
  cleanupTree,
} = require('./utils');

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

const createVisitorFromScout = scoutString => {
  const skipNodes = [
    'Program'
  ];

  const scoutAst = getAst(scoutString);
  let scoutTree = {};
  let pathRef = scoutTree;

  traverse(scoutAst, {
    enter(path) {
      if (!skipNodes.includes(path.node.type)) {
        const pathProfile = Object.assign(getPathProfile(path), { parent: pathRef });

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

  scoutTree = groomScoutTree(scoutTree);
  scoutTree = decorateTreeWithSiblingNavigation(scoutTree); // add sibling next/prev to path results
  pathRef = scoutTree && scoutTree.paths && scoutTree.paths.length ? scoutTree.paths[0] : null;

  // console.log(JSON.stringify(cleanupTree(scoutTree), decycle(), 2));
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