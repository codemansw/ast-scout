var expect = require('chai').expect;

const {
  relayStartRoute,
  collectSearchRoutes,
  collectMatchRoutes,
  deDuplicateRouteReducer,
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

  describe('collectMatchRoutes', () => {
    it('Should return routes that match criteria', () => {
      const stateTree = [
        {
          scout: {
            done: true,
          },
          pathRef: {
            foo: 'foo'
          }
        }, {
          scout: {
            done: true,
            marked: true
          },
          pathRef: {
            foo: 'fee'
          }
        }, {
          scout: {
            done: false,
            marked: true
          },
          pathRef: {
            foo: 'faa'
          },
          routes: [{
            scout: {
              done: true,
              marked: true
            },
            pathRef: {
              foo: 'fuu'
            }  
          }]
        }
      ];
      const expected = [stateTree[1].pathRef, stateTree[2].routes[0].pathRef];
      const result = collectMatchRoutes(stateTree);

      expect(result).to.deep.equal(expected);
    });

  });

  describe('deDuplicateRouteReducer', () => {

    it ('Should remove duplicates of the same path', () => {
      const stateTree = [
        {
          node: {
            start: 0,
            end: 10,
          },
          scout: {
            done: true,
          },
          pathRef: {
            foo: 'foo'
          }
        }, {
          node: {
            start: 10,
            end: 20,
          },
          scout: {
            done: true,
            marked: true
          },
          pathRef: {
            foo: 'fee'
          }
        }, {
          node: {
            start: 30,
            end: 40,
          },
          scout: {
            done: false,
            marked: true
          },
          pathRef: {
            foo: 'faa'
          },
          routes: [{
            node: {
              start: 50,
              end: 60,
            },
              scout: {
              done: true,
              marked: true
            },
            pathRef: {
              foo: 'fuu'
            }  
          }]
        }
      ];
  
      const expected = [stateTree[1], stateTree[2].routes[0]];
      const result = [stateTree[1], stateTree[2].routes[0], stateTree[1]]
        .reduce(deDuplicateRouteReducer, []);

      expect(result).to.deep.equal(expected);
    })
  });

});
