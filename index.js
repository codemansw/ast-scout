/* eslint-disable no-undef */
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

const t = require('@babel/types');
const decycle = require('json-decycle').decycle;
const {
  getPathProfile,
  createVisitorObject,
  decorateTreeWithSiblingNavigation,
  cleanupState,
  cleanupTree,
} = require('./utils');

const getAst = (code, config = {}) => {
    const defaultConfig = {
        sourceType: 'module',
        plugins: ['jsx', 'decorators-legacy', 'classProperties', 'objectRestSpread'],
    }

    return parser.parse(code, Object.assign(defaultConfig, config));
};

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

// const filePath = path.resolve('.', 'test-data/test.js');
const filePath = path.resolve('.', 'test-data/App.js');
const code = fs.readFileSync(filePath).toString();
const ast = getAst(code);

const scout3 = 'getMyString(<resolve:any>)'; //
const scout4 = 'getMyString(welcomeMessageKey)'; //possible
const scout5 = '</^getMyString$/>(<resolve>)'; //possible
const scout6 = '${/^getMyString$/}(<resolve>)'; //no
const scout7 = '<SearchBox key={previousSearchTerm} />';
const scout8 = 'const welcomeMessageKey = firstName ? WELCOME_MESSAGE_KEY : ANONYMOUS_WELCOME_MESSAGE_KEY;';
const scout9 = '<Routes />';
const scout10 = '<Headline>{this.headlineMessage}</Headline>';
const scout11 = 'import { getUserFirstName } from \'./bootstrap/bootstrap\';';
const scout12 = 'key={previousSearchTerm}';

const { scoutVisitorObject, stateObject } = createVisitorFromScout(scout11);

traverse(ast, {
  Program: function programVisitor(path) {
    path.traverse(scoutVisitorObject, stateObject);
  }
});

console.log('state', JSON.stringify(cleanupState(stateObject.state), decycle(), 2));
