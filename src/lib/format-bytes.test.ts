import { describe, expect, test } from 'bun:test';
import { formatBytes } from './format-bytes';

describe('formatBytes', () => {
  test('KB abaixo de 1 MB, nunca "0 KB"', () => {
    expect(formatBytes(10)).toBe('1 KB');
    expect(formatBytes(850 * 1024)).toBe('850 KB');
  });

  test('MB com uma casa, vírgula brasileira', () => {
    expect(formatBytes(2.34 * 1024 * 1024)).toBe('2,3 MB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });
});
