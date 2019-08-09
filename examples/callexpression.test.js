const expect = require('chai').expect;

const traverse = require('@babel/traverse').default;
const parser = require('@babel/parser');

const { findPaths } = require('../index');

describe('examples CallEpression', () => {
  const code = `
    import { bla } from 'common/utils';

    const fnRef = bla;

    function foo() {
      bla('Hello world!');
    }

    function foo2() {
      bla('Hello earth!');
    }

    function foo3() {
      bla(KEY_VALUE);
    }

    const fn1 = () => {
      function bla(a) {
        let b = a;
      }
    }

    const fn2 = () => {
      const bla = a => {
        let b = a;
      }
    }
  `;

  const babelConfig = {
    sourceType: 'unambiguous',
    plugins: ['jsx', 'decorators-legacy', 'classProperties', 'objectRestSpread'],
  }

  const ast = parser.parse(code, babelConfig);

  it('should return on scout-simple-search-string 1 searchPaths and 0 matchPaths', () => {
    // init
    const scout = 'bla(\'Hello world!\');'
    let result;

    // exec
    traverse(ast, {
      Program: function programVisitor(path) {
        result = findPaths(path, scout, babelConfig);
      }
    });

    const { searchPaths, matchPaths } = result;

    //test
    expect(searchPaths.length).to.equal(1);
    expect(matchPaths.length).to.equal(0);
  });

  it('should return on scout-obj-search-string 1 searchPaths and 0 matchPaths', () => {
    // init
    const scout = {
      search: 'bla(\'Hello world!\');',
    };
    let result;

    // exec
    traverse(ast, {
      Program: function programVisitor(path) {
        result = findPaths(path, scout, babelConfig);
      }
    });

    const { searchPaths, matchPaths } = result;

    //test
    expect(searchPaths.length).to.equal(1);
    expect(matchPaths.length).to.equal(0);
  });

  it('should return on scout-obj-search-match 2 searchPaths and 0 matchPaths', () => {
    // init
    const scout = {
      search: 'bla(\'Hello world!\');',
      match: [{
        search: 'Hello world!',
        regExpr: /^Hello world!$|^Hello earth!$/
      }]
    };
    let result;

    // exec
    traverse(ast, {
      Program: function programVisitor(path) {
        result = findPaths(path, scout, babelConfig);
      }
    });

    const { searchPaths, matchPaths } = result;

    //test
    expect(searchPaths.length).to.equal(2);
    expect(matchPaths.length).to.equal(0);
  });

  it('should return on scout-obj-search-match 2 searchPaths and 2 matchPaths', () => {
    // init
    const scout = {
      search: 'bla(\'Hello world!\');',
      match: [{
        search: 'Hello world!',
        regExpr: /^Hello .*$/,
        marked: true,
      }]
    };
    let result;

    // exec
    traverse(ast, {
      Program: function programVisitor(path) {
        result = findPaths(path, scout, babelConfig);
      }
    });

    const { searchPaths, matchPaths } = result;

    //test
    expect(searchPaths.length).to.equal(2);
    expect(matchPaths.length).to.equal(2);
    expect(matchPaths[0].node.value).to.equal('Hello world!');
    expect(matchPaths[1].node.value).to.equal('Hello earth!');
  });

  it('should return on scout-obj-identifier-search-match 1 searchPaths and 1 matchPaths', () => {
    // init
    const scout = {
      search: 'bla(KEY_VALUE);',
      match: [{
        search: 'KEY_VALUE',
        marked: true,
      }]
    };
    let result;

    // exec
    traverse(ast, {
      Program: function programVisitor(path) {
        result = findPaths(path, scout, babelConfig);
      }
    });

    const { searchPaths, matchPaths } = result;

    //test
    expect(searchPaths.length).to.equal(1);
    expect(matchPaths.length).to.equal(1);
    expect(matchPaths[0].node.type).to.equal('Identifier');
    expect(matchPaths[0].node.name).to.equal('KEY_VALUE');
  });

});






