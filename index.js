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
  getFingerPrint,
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

const filePath = path.resolve('.', 'test-data/test.js');
// const filePath = path.resolve('.', 'test-data/App.js');
const code = fs.readFileSync(filePath).toString();
const ast = getAst(code);


const scout3 = 'getMyString($$resolve)'; //no
// const scout4 = 'getMyString(<resolve>)'; //possible
const scout4 = 'getMyString(welcomeMessageKey)'; //possible
const scout5 = '</^getMyString$/>(<resolve>)'; //possible
const scout6 = '${/^getMyString$/}(<resolve>)'; //no
const scout7 = '<SearchBox key={previousSearchTerm} />';
const scout8 = 'const welcomeMessageKey = firstName ? WELCOME_MESSAGE_KEY : ANONYMOUS_WELCOME_MESSAGE_KEY;';
const scout9 = '<Routes />';
const scout10 = '<Headline>{this.headlineMessage}</Headline>';
const scout11 = 'import { getUserFirstName } from \'./bootstrap/bootstrap\';';
const scout12 = 'key={previousSearchTerm}';

//build traverse from scout that returns all matching nodes
//identify <resolve>'s hunt for StringLiteral values

function getScoutFunction(scout) {
  const skipNodes = [
    'Program'
  ];

  // create valid scoutString string where options are replaced
  // replace <resolve> with internal Identifier, only one <resolve> is allowed

  // const match = scout.match(/<[^>]*>/g);
  // const resolveRegExp = /<[^>]*>/g;
  const resolveRegExp = /<resolve>/g;
  const scoutMatch = scout.match(resolveRegExp);

  if (scoutMatch && scoutMatch.length > 1) {
    console.warn('getScoutFunction: only one <resolve> option is supported!');
    return null;
  }

  const code = scout.replace(resolveRegExp);
  // const scoutAst = parser.parse(code);
  const scoutAst = getAst(code);

  let scoutTree = {};
  let treeRef = scoutTree;

  traverse(scoutAst, {
    enter(path) {
      if (!skipNodes.includes(path.node.type)) {
        const nodeFingerPrint = Object.assign(getFingerPrint(path), { parent: treeRef });

        treeRef.paths = treeRef.paths || [];
        treeRef.paths.push(nodeFingerPrint);
        treeRef = treeRef.paths[treeRef.paths.length -1];
      }
    },
    exit(path) {
      if (!skipNodes.includes(path.node.type)) {
        treeRef = treeRef.parent;
      }
    }
  });

  // remove top container node (first node) from scoutTree
  // and remove any references to the container node
  if (
    scoutTree &&
    scoutTree.paths &&
    scoutTree.paths.length &&
    scoutTree.paths[0].paths &&
    scoutTree.paths[0].paths.length
  ) {
    scoutTree = {
      paths: scoutTree.paths[0].paths
    };
    delete scoutTree.paths[0].parent;
    delete scoutTree.paths[0].inList;
    delete scoutTree.paths[0].listKey;
    delete scoutTree.paths[0].key;
    delete scoutTree.paths[0].parentKey;
  
  } else {
    scoutTree = {};
  }

  // add sibling next/prev to path results
  scoutTree = decorateTreeWithSiblingNavigation(scoutTree);

  console.log(JSON.stringify(cleanupTree(scoutTree), decycle(), 2));


  const state = [];
  const scoutVisitorObject = createVisitorObject(scoutTree);

  // point to first node in scoutTree
  scoutRef = scoutTree && scoutTree.paths && scoutTree.paths.length ? scoutTree.paths[0] : null;

  traverse(ast, {
    Program: function programVisitor(path) {
      path.traverse(scoutVisitorObject, {
        scoutTree: scoutRef,
        state,
        parent: null });
    }
  });

  console.log('state', JSON.stringify(cleanupState(state), decycle(), 2));
}

// getScoutFunction(scout4);
// getScoutFunction(scout7);
// getScoutFunction(scout8);
// getScoutFunction(scout9);
// getScoutFunction(scout10);
getScoutFunction(scout11);
// getScoutFunction(scout12);

