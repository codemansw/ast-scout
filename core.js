/* eslint-disable no-undef */
/* eslint-disable no-console */
const t = require('@babel/types');
const has = require("lodash/has");
const isNumber = require("lodash/isNumber");
const isString = require("lodash/isString");
const isObject = require("lodash/isObject");
const isBoolean = require("lodash/isBoolean");
const isArray = require("lodash/isArray");
const isUndefined = require("lodash/isUndefined");

const { SCOUT_DEBUG = 'false' } = process.env;

const pathOpts = [
  'inList',
  'listKey',
  'key',
  'parentKey',
];

scoutSkipKeys = [
  'next',
  'prev',
  'parent',
  'indexPath',
]

nodeAdditionalKeys = [
  'start',
  'end',
]

checkValue = (value, key) => {
  if (isString(value) || isNumber(value) || isBoolean(value)) {
    return value;
  } else if (isArray(value)) {
    return 'array';
  } else if (isObject(value)) {
    return 'object';
  } else if (isUndefined(value)) {
    return value;
  } else {
    console.warn(`core.checkValue: uncovered key:'${key}', value:'${value}'`);
  }

  return value;
}

const findScoutMatch = (scout, key, value) => {
  if (!scout || !scout.matches || !scout.matches.length) {
    return null;
  }

  const result = scout.matches.filter( match => value === match.search);

  return result.length ? Object.assign({ key }, result[0]) : null;
}

buildPathProfile = (path, scout) => {
  const profile = {};
  let match;

  pathOpts.reduce( (previousValue, key) => {
    previousValue[key] = checkValue(path[key], key);

    return previousValue;
  }, profile);

  profile.node = {
    type: path.node.type,
  }

  t.BUILDER_KEYS[path.node.type].reduce( (previousValue, key) => {
    previousValue[key] = checkValue(path.node[key], key);

    if (match = findScoutMatch(scout, key, path.node[key])) {
      profile.match = match;
      if (SCOUT_DEBUG === 'true') {
        console.log(`match: ${match}`);
      }  
    }

    return previousValue;
  }, profile.node);

  profile.nodeIsDeclaration = t.isDeclaration(path.node);

  return profile;
}

const checkMatch = (match, value, key) => {
  if (!match || key === 'type') {
    return false; //skip
  }

  if (key !== match.key) {
    return false; //skip
  }

  if (match.regExpr.test(value)) {
    return true;
  }

  return false;
}

const matchScout = (path, scout) => {
  // check path:
  let match = Object.keys(scout).reduce( (previousValue, key) => {
    if (isString(scout[key]) && !scoutSkipKeys.includes(key)) { // limit to path key & string values
      previousValue = checkValue(path[key], key) === scout[key];
    }

    return previousValue;
  }, true);

  let scoutMatch = false; //indicates matching one of the scout defined matches
  let scoutMarked = false; //add marking for later paths resolving

  // check path.node:
  match = Object.keys(scout.node).reduce( (previousValue, key) => {
    if (isString(scout.node[key])) { // limit to path.node key & string values
      const valueCheck = checkValue(path.node[key], key) === scout.node[key];
      const matchCheck = checkMatch(scout.match, path.node[key], key);

      scoutMatch = scoutMatch || matchCheck;
      scoutMarked = scoutMarked || (scout.match && scout.match.marked && scoutMatch);

      previousValue = previousValue && (valueCheck || matchCheck);
    }

    return previousValue;
  }, match);

  return {
    match,
    scoutMarked
  }
}

const createState = ({
  path,
  parent,
  scout,
  scoutMarked,
}) => {
  const state = {
    type: path.node.type,
    node: {},
    scout: {
      indexPath: scout.indexPath,
      done: false,
    },
    pathRef: path,
    parent,
  };

  pathOpts.forEach( key => {
    state[key] = checkValue(path[key], key);
  });

  Object.keys(scout.node).forEach( key => {
    state.node[key] = checkValue(path.node[key], key);
  });

  nodeAdditionalKeys.forEach( key => {
    state.node[key] = checkValue(path.node[key], key);
  })
  
  if (scoutMarked) {
    state.scout.marked = scoutMarked;
  }

  return state;
}

const visitorFunctionFactory = visitorObject => {
  return function(path) {
    let match = false;
    let scoutMarked = false;
    let scout = this.scoutTree;
    let next = false;

    do {
      next = false;

      const result = matchScout(path, scout);

      match = result.match;
      scoutMarked = result.scoutMarked;

      if (!match && scout.next) {
        next = true;
        scout = scout.next;
      }
    } while(!match && next);

    if (match) {
      const newState = createState({
        path,
        visitorObject,
        parent: this.parent,
        scout,
        scoutMarked,
      });

      if (Object.keys(visitorObject).length) {
        const newScout = scout.paths ? scout.paths[0] : null;
        const newPaths = [];

        path.traverse(visitorObject, {
          scoutTree: newScout,
          state: newPaths,
          parent: newState,
        });

        if (newPaths.length) {
          newState.paths = newState.paths ? newState.paths.push(...newPaths) : [...newPaths];
        }
      }

      if (
        (
          !newState.paths &&
          !scout.paths
        ) || 
        (
          has(scout, 'paths.length') &&
          has(newState, 'paths.length') &&
          scout.paths.length === newState.paths.filter( path => path.scout.done ).length
        )
      ) {
        this.state.push(newState);
        newState.scout.done = true;
        path.skip(); //skip traversing the children of the current path
      }

    }    
  }
}

function createVisitorObject(scoutTree) {
  let scoutRefs = scoutTree && scoutTree.paths && scoutTree.paths.length ? scoutTree.paths : [];

  if (scoutRefs.length === 0) {
    return {}
  }

  const visitor = {};
  
  scoutRefs.forEach( scout => {
    const visitorObject = createVisitorObject(scout);

    if (!visitor[scout.node.type]) {
      visitor[scout.node.type] = visitorFunctionFactory(visitorObject);
    }
  });

  return visitor;
}

module.exports = {
  buildPathProfile,
  visitorFunctionFactory,
  createVisitorObject,
}
