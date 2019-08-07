# ast-scout
Search abstract syntax tree (Babylon AST) and report mathing paths.

## Installation

```sh
npm i ast-scout --save
```

## Usage

This is a tool to search AST for objects on basis of a string of code. This can be useful for collecting info from your codebase.

### example

```js
const traverse = require('@babel/traverse').default;
const { findPaths, getAst } = require('ast-scout');

const code = `
  import { bla } from 'common/utils';

  function foo() {
    bla('Hello world!');
  }

  function foo2() {
    bla('Hello earth!');
  }
`;

const babelConfig = {
  sourceType: 'unambiguous',
  plugins: ['jsx', 'decorators-legacy', 'classProperties', 'objectRestSpread'],
}

const ast = getAst(code, babelConfig);

const scout = {
  search: 'bla()',
  matches: [{
    search: 'bla',
    marked: true,
  }]
};

traverse(ast, {
  Program: function programVisitor(path) {
    const { searches, matches } = findPaths(path, scout);

    console.log('searches', searches.length);
    console.log('matches', matches.length);
    matches.forEach( path => {
      console.log(`match type: ${path.parentPath.node.arguments[0].type}`);
      console.log(`      code: ${generate(path.parentPath.node.arguments[0]).code}`);
    });
  }
});

```

### result

```sh
searches 3
matches 3
match type: StringLiteral
      code: 'Hello world!'
match type: StringLiteral
      code: 'Hello earth!'
match type: Identifier
      code: KEY_VALUE
```
