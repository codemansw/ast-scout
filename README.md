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
const parser = require('@babel/parser');
const findPaths = require('ast-scout').findPaths;

const code = `
  import { bla } from 'common/utils';

  function foo() {
    bla('Hello world!');
  }

  function foo2() {
    bla('Hello earth!');
  }
`;

const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'decorators-legacy', 'classProperties', 'objectRestSpread'],
});

const scout = {
  search: 'bla(\'Hello world!\')',
  matches: [{
    search: 'Hello world!',
    regExpr: /^.*$/,
    marked: true
  }]
}

traverse(ast, {
  Program: function programVisitor(path) {
    const { searches, matches } = findPaths(path, scout);

    console.log('searches', searches.length);
    console.log('matches', matches.length);

    matches.forEach( path => {
      console.log(path.node.name);
    })
  }
});

```

result:

```sh
searches 2
matches 2
Hello world!
Hello earth!
```
