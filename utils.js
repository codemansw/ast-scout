/* eslint-disable no-undef */
/* eslint-disable no-console */
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const isString = require("lodash/isString");
const isObject = require("lodash/isObject");
const isBoolean = require("lodash/isBoolean");
const isNumber = require("lodash/isNumber");
const isArray = require("lodash/isArray");
const has = require("lodash/has");

const pathOpts = [
  'inList',
  'listKey',
  'key',
  'parentKey',
];

checkValue = value => {
  if (isString(value) || isNumber(value) || isBoolean(value)) {
    return value;
  } else if (isArray(value)) {
    return 'array';
  } else if (isObject(value)) {
    return 'object';
  }

  return value;
}

getFingerPrint = path => {
  const nodeFingerPrint = {
  }

  pathOpts.reduce( (previousValue, key) => {
    previousValue[key] = checkValue(path[key]);

    return previousValue;
  }, nodeFingerPrint);

  nodeFingerPrint.node = {
    type: path.node.type,
  }

  t.BUILDER_KEYS[path.node.type].reduce( (previousValue, key) => {
    previousValue[key] = checkValue(path.node[key]);

    return previousValue;
  }, nodeFingerPrint.node);

  return nodeFingerPrint;
}

function createVisitorObject(scoutTree) {
  let scoutRef = scoutTree && scoutTree.paths && scoutTree.paths.length ? scoutTree.paths[0] : null;

  if (!scoutRef) {
    // console.log('none:', scoutRef);
    return {}
  }

  const visitorObject = createVisitorObject(scoutRef);
  // console.log('visitorObject', visitorObject);

  return {
    [scoutRef.node.type]: function(path) {
      // if (path.node.callee && path.node.callee.name === 'getDictionaryString') {
      //   let a = 1;
      // }
      // console.log(path.node.type);
      // console.log(`code: "${generate(path.node).code}"`);
      // console.log(this.scoutTree.next ? true : false);

      let checkForMatch = false;
      let scout = this.scoutTree;
      let next = false;

      do {
        next = false;

        // compare scout with path/node
        checkForMatch = Object.keys(scout).reduce( (previousValue, key) => {
          if (isString(scout)) { // limit to path key & string values
            previousValue = previousValue && checkValue(path[key]) === scout[key];
          }

          return previousValue;
        }, true);

        checkForMatch = Object.keys(scout.node).reduce( (previousValue, key) => {
          if (isString(key)) { // limit to path.node key & string values
            previousValue = previousValue && checkValue(path.node[key]) === scout.node[key];
          }

          return previousValue;
        }, checkForMatch);

        if (checkForMatch) {
          // path.stop();

        } else if (scout.next) {
          next = true;
          scout = scout.next;
        }
      } while(!checkForMatch && next);

      // if (checkForMatch && !this.state.checkForMatch) {
      if (checkForMatch) {
        // console.log('match::::::::::::::::::::');

        // console.log(1, this.state);
        const newState = {
          type: path.node.type,
          checkForMatch,
          node: {},
          scoutDone: Object.keys(visitorObject).length === 0,
          parent: this.parent,
          scout,
        };
        pathOpts.forEach( key => {
          newState[key] = checkValue(path[key]);
        });
        Object.keys(scout.node).forEach( key => {
          newState.node[key] = checkValue(path.node[key]);
        });

        // console.log(2, this.state);

        // console.log('::::::::::::::::::::');

        if (Object.keys(visitorObject).length) {
          // console.log('::::::::: more :::::::::::');
          const newPaths = [];

          path.traverse(visitorObject, {
            scoutTree: this.scoutTree && this.scoutTree.paths && this.scoutTree.paths.length ? this.scoutTree.paths[0] : null,
            state: newPaths,
            parent: newState,
          });

          if (newPaths.length) {
            newState.paths = newState.paths ? newState.paths.push(...newPaths) : [...newPaths];
            // console.log('newState.paths', newState.paths)
          }
        }

        this.state.push(newState);

        // console.log(3, this.state);
        // console.log(':::::::::: end ::::::::::');
      }
    },
  }
}

const decorateTreeWithSiblingNavigation = scoutTree => {
  if (scoutTree.paths) {
    scoutTree.paths.map( (path, index) => {
      if (scoutTree.paths.length > index + 1) {
        path.next = scoutTree.paths[index + 1];
      }
      if (index < scoutTree.paths.length + 1) {
        path.prev = scoutTree.paths[index - 1];
      }

      return decorateTreeWithSiblingNavigation(path);
    });
  };

  return scoutTree;
}

module.exports = {
  getFingerPrint,
  createVisitorObject,
  decorateTreeWithSiblingNavigation,
}