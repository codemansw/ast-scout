var expect = require('chai').expect;

const {
  relayStartRoute,
  collectSearchRoutes,
  collectMatchRoutes,
  deDuplicateRoutes,
} = require('./route');

describe('utils.route', () => {

  describe('relayStartRoute', () => {
    let routeTree;

    beforeEach('init', () => {
      routeTree = {
        routes: [
          {
            node: {
              type: 'startType'
            },
            routes: [{
              node: {
                type: 'startTypeOne'
              }
            }]
          },{
            foo: 'bla'
          },{
            node: {
              type: 'startTypeTwo'
            },
            routes: [{
              node: {
                type: 'startTypeThree'
              }
            }]
          }, {
            foo: 'foo',
            node: {
              type: 'startTypeTwo'
            }
          }
        ]
      };
    });

    it('Should return null when child attribute routes is absent', () => {
      const result = relayStartRoute(routeTree.routes[1]);

      expect(result).to.equal(null);
    });

    it('Should return first route in routeTree which node type is equal to startType', () => {
      const result = relayStartRoute(routeTree, 'startType');

      expect(result).to.deep.equal(routeTree.routes[0]);
    });

    it('Should return first route in routeTree which node type is equal to startTypeOne', () => {
      const result = relayStartRoute(routeTree, 'startTypeOne');

      expect(result).to.deep.equal(routeTree.routes[0].routes[0]);
    });

    it('Should return first route in routeTree which node type is equal to startTypeTwo', () => {
      const result = relayStartRoute(routeTree, 'startTypeTwo');

      expect(result).to.deep.equal(routeTree.routes[2]);
    });

    it('Should return first route in routeTree which node type is equal to startTypeThree', () => {
      const result = relayStartRoute(routeTree, 'startTypeThree');

      expect(result).to.deep.equal(routeTree.routes[2].routes[0]);
    });

    it('Should return only first route in routeTree which node type is equal to startTypeTwo', () => {
      const result = relayStartRoute(routeTree, 'startTypeTwo');

      expect(result).to.deep.equal(routeTree.routes[2]);
    });

  });

  describe('collectSearchRoutes', () => {
    let stateTree;

    beforeEach('init', () => {
      stateTree = [
        {
          pathRef: {
            foo: 'foo'
          }
        }, {
            scout: {
              done: true
            },
            pathRef: {
              foo: 'fee'
            }
        }, {
          scout: {
            done: true
          },
          pathRef: {
            foo: 'faa'
          }
        }
      ];
    });

    it('Should return top level path results', () => {
      const expected = [stateTree[1].pathRef, stateTree[2].pathRef];
      const result = collectSearchRoutes(stateTree);

      expect(result).to.deep.equal(expected);
    })
  });

});
