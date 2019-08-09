const parser = require('@babel/parser');

const getAst = (code, config = {}) => {
  // todo: remove default config
  const defaultConfig = {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'decorators-legacy', 'classProperties', 'objectRestSpread'],
  }

  return parser.parse(code, Object.assign(defaultConfig, config));
};

module.exports = {
  getAst, 
}