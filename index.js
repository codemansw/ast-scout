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

// const scout = require('./scout');

const getAst = (code, config = {}) => {
    const defaultConfig = {
        sourceType: 'module',
        plugins: ['jsx', 'decorators-legacy', 'classProperties', 'objectRestSpread'],
    }

    return parser.parse(code, Object.assign(defaultConfig, config));
};

const filePath = path.resolve('.', 'test-data/test.js');
const code = fs.readFileSync(filePath).toString();
const ast = getAst(code);

// console.log(ast);
// console.log(code);

const scout = {
  search: {
    type: 'CallExpression',
    validate: {
      'node.callee.type': 'Identifier',
      'node.callee.name': 'getDictionaryString',
      binding: {
        'parentPath.type': 'ImportSpecifier',
        'parentPath.parentPath.type': 'ImportDeclaration',
        // 'parent.parent.source.type': 'StringLiteral',
        // 'parent.parent.source.value': /\/common\/utils\/dictionary\/dictionary$/
      }
    }  
  },
  resolve: {
    type: /.*/,
    validate: {
      'inList': true,
      'key': 0,
      'listKey': /^arguments$/,
    }
  }
}

const scout2 = {
  search: {
    node: {
      type: 'CallExpression',
      opts: {
        callee: {
          type: 'Identifier',
          opts: {
            name: 'getDictionaryString'
          }
        }
      }
    },
  }
};

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


//build traverse from scout that returns all matching nodes
//identify <resolve>'s hunt for StringLiteral values



function getScoutFunction(scout) {
  const allowed = [
    'ExpressionStatement',
    'CallExpression',
    'Identifier',
    'AssignmentExpression',
    'ObjectExpression',
    'ObjectProperty'
  ]

  const skipNodes = [
    'Program'
  ];

  const opts = [
    'inList',
    'listKey',
    'key',
    'parentKey',
  ]
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

  // console.log('ast', JSON.stringify(ast, null, 2));

  // let scoutVisitorObject = {};
  // const scoutStack = []
  let scoutTree = {};
  let treeRef = scoutTree;

  traverse(scoutAst, {
    enter(path) {
      if (!skipNodes.includes(path.node.type)) {
        // console.log('enter', path.node.type);

        //skip first container node
        // if (treeRef === null) { 
        //   treeRef = scoutTree

        // } else {
          const nodeFingerPrint = Object.assign(getFingerPrint(path), { parent: treeRef });

          // if (!treeRef.paths) { // first node in scoutTree
          //   nodeFingerPrint.pathOpts = {};
          // }
  
          treeRef.paths = treeRef.paths || [];
          treeRef.paths.push(nodeFingerPrint);
          treeRef = treeRef.paths[treeRef.paths.length -1];
        // }

        // scoutStack.push(path);
        // scoutVisitor[path.node.type] = function(path) {
        //   console.log('scoutVisitor', path.node.type);
        //   // path.traverse()
        //   Object.assign(this.state, { [path.node.type]: path.node.type });
        // }
      }
    },
    exit(path) {
      // if (allowed.includes(path.node.type) && (t.isIdentifier(path.node) ? path.node.name : true) ) {
      if (!skipNodes.includes(path.node.type)) {
        // console.log('exit', path.node.type);
        treeRef = treeRef.parent;

        /*
        const scoutPath = scoutStack.pop();

        scoutVisitorObject = (scoutVisitorObject => {
          console.log(scoutVisitorObject);
          return {
            [path.node.type]: function(path) {
              console.log('scoutVisitorObject:', path.node.type);
              // console.log('keys:', Object.keys(scoutVisitorObject));
  
              if (Object.keys(scoutVisitorObject).length) {
                path.traverse(scoutVisitorObject);
              }
            }
          };
        })(scoutVisitorObject);
        */
        
        // scoutVisitor[path.node.type] = function(path) {
        //     console.log('scoutVisitor', path.node.type);
        // }
        // console.log('exit scoutPath', path.node.type);
      }
    }
  });

  // console.log('#', t.VISITOR_KEYS['CallExpression']);
  // console.log('#', t.ALIAS_KEYS['CallExpression']);
  // console.log('#', t.FLIPPED_ALIAS_KEYS['CallExpression']);
  // console.log('#', t.NODE_FIELDS['CallExpression']);
  // console.log('#', t.BUILDER_KEYS['CallExpression']);
  // console.log('#', t.DEPRECATED_KEYS['CallExpression']);
  
  // console.log('#', t.BUILDER_KEYS['Identifier']);
  // console.log('#', t.NODE_FIELDS['Identifier']);


  // console.log('>>', scoutVisitorObject);

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

  // console.log(JSON.stringify(scoutTree, decycle(), 2));

  // add sibling next/prev to path results
  scoutTree = decorateTreeWithSiblingNavigation(scoutTree);

  console.log(JSON.stringify(cleanupTree(scoutTree), decycle(), 2));

  // skip container:
  // treeRef = scoutTree.paths && scoutTree.paths.length ? scoutTree.paths[treeRef.paths.length -1]
  
  // const scoutVisitorObject2 = {
  //   // ExpressionStatement: function(path) {
  //   //   console.log(path.node.type);
  //   //   console.log('code', generate(path.node).code);
  //   //   path.traverse(
  //   //     //////////////
  //   //     {
  //         CallExpression: function(path) {
  //           console.log(path.node.type);
  //           console.log('code', generate(path.node).code);
  //           path.traverse(
  //             //////////////
  //             {
  //               Identifier: function(path) {
  //                 console.log(path.node.type);
  //                 console.log('code', generate(path.node).code);
  //               }
  //             }
  //             //////////////
  //           )
  //         }
  //     //   }
  //     //   //////////////
  //     // )
  //   // }
  // }

  const state = [];
  const scoutVisitorObject = createVisitorObject(scoutTree);
  // point to first node in scoutTree
  scoutRef = scoutTree && scoutTree.paths && scoutTree.paths.length ? scoutTree.paths[0] : null;

  // console.log('>>', ast);
  traverse(ast, {
    Program: function programVisitor(path) {
      path.traverse(scoutVisitorObject, {
        scoutTree: scoutRef,
        state,
        parent: null });
    }
  });

  console.log('state', JSON.stringify(cleanupState(state), decycle(), 2));

  // traverse(ast, scoutVisitorObject2);
  // console.log('>>>');

  // console.log(state);
  // parse scoutString in ast
  // build scoutFunction on basis of ast
}

// getScoutFunction(scout4);
// getScoutFunction(scout7);
// getScoutFunction(scout8);
// getScoutFunction(scout9);
// getScoutFunction(scout10);
getScoutFunction(scout11);

/*
traverse(ast, {
  Program: function programVisitor(path) {
      path.traverse({
          [scout.search.type](path) {
            if (t.isCallExpression(path.node) &&
              t.isIdentifier(path.node.callee, { name: 'getDictionaryString'} )
            ) {
              console.log(path.node);
            }
          }
      }, {
          // prerequisite: keySearch.prerequisite,
          // state,
      });
  },
});
*/
// traverse(ast, {
//   Program: function programVisitor(path) {
//     path.traverse({
//       enter(path) {
//         if (t.isImportDeclaration(path.node)) {
//           let a = 1;
//         }

//         path.next();
//       }
//     });
//   }
// });

