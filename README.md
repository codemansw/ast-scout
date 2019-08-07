# ast-scout
Search abstract syntax tree (Babylon AST) and report mathing paths.

## Installation

```sh
npm i ast-scout --save
```

## Usage

This is a tool to search AST for objects on basis of a string of code. AstScout can be useful for collecting info from your codebase.

From the scout's search definition ast-scout creates internally (with help of Babel) a visitor object tree where each visitor is, if required from the provided match definitions, decorated with additional logic to report back specific AST paths.

### example

```js
const findPaths = require('ast-scout').findPaths;
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const parser = require('@babel/parser');

const code = `
  import { bla } from 'common/utils';

  function foo() {
    bla('Hello world!');
  }

  function foo2() {
    bla('Hello earth!');
  }

  function foo3() {
    bla(KEY_VALUE);
  }
`;

const babelConfig = {
  sourceType: 'unambiguous',
  plugins: ['jsx', 'decorators-legacy', 'classProperties', 'objectRestSpread'],
}

const ast = parser.parse(code, babelConfig);

const scout = {
  search: 'bla()',
  match: [{
    search: 'bla',
    marked: true,
  }]
};

traverse(ast, {
  Program: function programVisitor(path) {
    const { searchPaths, matchPaths } = findPaths(path, scout, babelConfig);

    console.log('searchPaths', searchPaths.length);
    console.log('matchPaths', matchPaths.length);
    matchPaths.forEach( path => {
      console.log(`match type: ${path.parentPath.node.arguments[0].type}`);
      console.log(`      code: ${generate(path.parentPath.node.arguments[0]).code}`);
    });
  }
});

```

### result

```sh
searchPaths 3
matchPaths 3
match type: StringLiteral
      code: 'Hello world!'
match type: StringLiteral
      code: 'Hello earth!'
match type: Identifier
      code: KEY_VALUE
```

## API

### findPaths

```js
findPaths(path, scout, babelConfig);
```

Returns an object with Babel path results for searchPaths and matchPaths.

#### Path

object - Babel path object.

#### Scout

string|object - Defines search, matching and path reporting requirements. See below for more scout examples.

#### BabelConfig

object - Internally babel parser is used for creating a nested visitors structrure. Passing this config ensures the AST created from the search parameter is in line with the AST created from the code you want to analyse.

### Scout Examples

#### Simple search

In the returned searchPaths all results found for CallExpression paths with the exact match of ```getMyString(welcomeMessageKey)``` are listed.

```js
const scout = 'getMyString(welcomeMessageKey)'
```

#### Search with regExpr defined in match

In the returned searchPaths all results found for ImportDeclaration paths with the exact match of ```import { getMyString } from \'./common/utils\``` are listed.

In the returned matchPaths all child paths are listed for Identifier ```getMyString``` and in addition for Identifier ```getAllMyStrings```.

To instruct ast-scout to include the matching child node in the matchPaths results use: ```marked: true```.

```js
const scout = {
  search: 'import { getMyString } from \'./common/utils\';',
  match: [{
    search: 'getMyString',
    regExpr: /^getMyString$|^getAllMyStrings$/,
    marked: true
  }, {
    search: './common/utils',
    regExpr: /common\/utils$/
  }],
}
```

#### Search with context and startType

Searching for jsx attribute declarations without providing the containing jsx container in the search term would lead us to result of object definitions types instead. Therefore we can define a search context ( a jsx attribute definition within div tags) and instruct the ast-scout process to start the visitor object tree at the JSXAttribute node.

In the returned searchPaths all paths found for the exact match of ```key={previousSearchTerm}``` are listed.

In the returned matchPaths all child paths are listed for Identifier ```previousSearchTerm```.

```js
const scout = {
  search: {
    context: '<div key={previousSearchTerm} />',
    startType: 'JSXAttribute'
  },
  match: [{
    search: 'previousSearchTerm',
    marked: true
  }],
}
```

