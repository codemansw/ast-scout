const expect = require('chai').expect;

const {checkValue} = require('./match');

describe('utils.match', () => {

  describe('checkValue', () => {

    it('Should return string as is', () => {
      const value = 'hello';
      const key = 'keyName';

      const result = checkValue(value, key);

      expect(result).to.equal(value);
    });

    it('Should return number as is', () => {
      const value = 10;
      const key = 'keyName';

      const result = checkValue(value, key);

      expect(result).to.equal(value);
    });

    it('Should return boolean as is', () => {
      const value = true;
      const key = 'keyName';

      const result = checkValue(value, key);

      expect(result).to.equal(value);
    });

    it('Should return Array as string', () => {
      const value = [1,2,3];
      const key = 'keyName';
      const expected = 'array';

      const result = checkValue(value, key);

      expect(result).to.equal(expected);
    });

    it('Should return Object as string', () => {
      const value = { a: 1, b: 2 };
      const key = 'keyName';
      const expected = 'object';

      const result = checkValue(value, key);

      expect(result).to.equal(expected);
    });

    it('Should return undefined as is', () => {
      const value = undefined;
      const key = 'keyName';

      const result = checkValue(value, key);

      expect(result).to.equal(value);
    });

    it('Should return null as is', () => {
      const value = null;
      const key = 'keyName';

      const result = checkValue(value, key);

      expect(result).to.equal(value);
    });

    it('Should return function as string', () => {
      const value = () => {};
      const key = 'keyName';
      const expected = 'function';

      const result = checkValue(value, key);

      expect(result).to.equal(expected);
    });

    it('Should return function as string', () => {
      const value = Symbol();
      const key = 'keyName';
      const expected = 'symbol';

      const result = checkValue(value, key);

      expect(result).to.equal(expected);
    });

  });

});
