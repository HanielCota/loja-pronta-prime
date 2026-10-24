import { describe, expect, test } from 'bun:test';
import { MAX_PAGE, parsePageNumber } from './search-params';

describe('parsePageNumber', () => {
  test('keeps a valid page', () => {
    expect(parsePageNumber('1')).toBe(1);
    expect(parsePageNumber('2')).toBe(2);
    expect(parsePageNumber(' 7 ')).toBe(7);
    expect(parsePageNumber(['3', '9'])).toBe(3);
  });

  test('falls back to the first page for missing or invalid values', () => {
    for (const value of [
      undefined,
      '',
      ' ',
      'abc',
      '0',
      '00',
      '-1',
      '1.5',
      '1e3',
      '2abc',
      'NaN',
      'Infinity',
      '0x10',
    ])
      expect(parsePageNumber(value)).toBe(1);
    expect(parsePageNumber([])).toBe(1);
  });

  test('stops at the last accepted page', () => {
    expect(parsePageNumber(String(MAX_PAGE - 1))).toBe(MAX_PAGE - 1);
    expect(parsePageNumber(String(MAX_PAGE))).toBe(MAX_PAGE);
    expect(parsePageNumber(String(MAX_PAGE + 1))).toBe(MAX_PAGE);
    expect(parsePageNumber('99999999999999999999')).toBe(MAX_PAGE);
    expect(parsePageNumber('9'.repeat(400))).toBe(MAX_PAGE);
  });
});
