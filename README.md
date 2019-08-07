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
searches 3
matches 3
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

Returns an object with Babel path results for searches and matches.

#### Path

object - Babel path object.

#### Scout

string|object - Defines search, matching and path reporting requirements. See below for more scout examples.

#### BabelConfig

object - Internally babel is used for creating the nested visitors structrure. Passing this config ensures babel is configured the same as the traverser.


