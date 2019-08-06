/* eslint-disable no-undef */
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const traverse = require('@babel/traverse').default;

const { findPaths } = require('./scout');
const { getAst } = require('./utils');

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
const scout14 = {
  search: 'import { getMyString } from \'./common/utils/dictionary/dictionary\';',
  matches: [{
    search: 'getMyString',
    regExpr: /^getMyString$|^getAllMyStrings$/,
    marked: true
  }, {
    search: './common/utils/dictionary/dictionary',
    regExpr: /common\/utils\/dictionary\/dictionary$/
  }],
}

traverse(ast, {
  Program: function programVisitor(path) {
    // const { searches, matches } = findPaths(path, scout4);
    // const { searches, matches } = findPaths(path, scout11);
    const { searches, matches } = findPaths(path, scout14);

    console.log('searches', searches.length);
    console.log('matches', matches.length);
  }
});

// const { scoutVisitorObject, stateObject } = createVisitorFromScout(scout11);
// console.log('state', JSON.stringify(cleanupState(stateObject.state), decycle(), 2));
