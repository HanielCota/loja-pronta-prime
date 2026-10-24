import { describe, expect, test } from 'bun:test';
import { wholeNumberField } from './form-number';

describe('whole number form field', () => {
  test('missing, empty or blank fields are not read as zero', () => {
    for (const value of [null, undefined, '', '   '])
      expect(wholeNumberField(value)).toBeUndefined();
  });

  test('anything other than plain digits is refused', () => {
    for (const value of ['-1', '1.5', '1e3', '0x1', 'NaN', 'Infinity', 'null', '١', '9999999999'])
      expect(wholeNumberField(value)).toBeUndefined();
    expect(wholeNumberField(new File([], 'a.txt'))).toBeUndefined();
  });

  test('plain digits, including zero, are kept', () => {
    expect(wholeNumberField('0')).toBe(0);
    expect(wholeNumberField(' 12 ')).toBe(12);
    expect(wholeNumberField('999')).toBe(999);
  });
});
