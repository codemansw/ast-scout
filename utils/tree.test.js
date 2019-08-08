var expect = require('chai').expect;
// const decycle = require('json-decycle').decycle;

const {
  decorateTreeWithSiblingNavigationAndIndex,
  groom,
} = require('./tree');

describe('utils.tree', () => {

  describe('decorateTreeWithSiblingNavigationAndIndex', () => {
    let routeTree;

    beforeEach('init', () => {
      routeTree = {
        routes: [{ routes: [{}, {}] }, {}, {} ],
      };
    });

    it('should add reference to next route on all routes but the last', () => {
      //exec
      const result = decorateTreeWithSiblingNavigationAndIndex(routeTree);
      // console.log(JSON.stringify(result, decycle(), 2));

      //test
      expect(result.routes[0].next).to.equal(result.routes[1]);
      expect(result.routes[1].next).to.equal(result.routes[2]);
      expect(result.routes[2].hasOwnProperty('next')).to.be.false;
      expect(result.routes[0].routes[0].next).to.equal(result.routes[0].routes[1]);
      expect(result.routes[0].routes[1].hasOwnProperty('next')).to.be.false;
    });

    it('should add reference to prev route on all routes but the first', () => {
      //exec
      const result = decorateTreeWithSiblingNavigationAndIndex(routeTree);
      // console.log(JSON.stringify(result, decycle(), 2));

      //test
      expect(result.routes[0].hasOwnProperty('prev')).to.be.false;
      expect(result.routes[1].prev).to.equal(result.routes[0]);
      expect(result.routes[2].prev).to.equal(result.routes[1]);
      expect(result.routes[0].routes[0].hasOwnProperty('prev')).to.be.false;
      expect(result.routes[0].routes[1].prev).to.equal(result.routes[0].routes[0]);
    });

  });

  describe('groom', () => {
    let routeTree;
    
    beforeEach('init', () => {
      routeTree = {
        routes: [{
          nodeIsDeclaration: false,
          node: {
            type: 'VariableDeclaration',
          },
          routes: [{
            node: {
              type: 'CallExpression',
            },
            routes: [{
              routes: [{}, {}] }, {}, {} ],
            }]
        }]
      };
    });

    it('Should remove top route from route-tree for any type but *Decalaration', () => {
      //exec
      const result = groom(routeTree);

      //test
      expect(result.routes[0].node.type).to.equal('CallExpression');
    })
  })

});
