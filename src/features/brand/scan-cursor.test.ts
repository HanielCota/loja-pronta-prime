import { describe, expect, test } from 'bun:test';
import { nextScanCursor } from './scan-cursor';

describe('nextScanCursor', () => {
  test('continues after a full page', () => {
    expect(nextScanCursor(['a', 'b', 'c'], 3)).toBe('c');
  });

  test('starts over after a partial or empty page', () => {
    expect(nextScanCursor(['a', 'b'], 3)).toBe('');
    expect(nextScanCursor([], 3)).toBe('');
  });

  test('visits every id even when the first page always fails', () => {
    const ids = Array.from({ length: 7 }, (_, index) => `id-${index}`);
    const seen = new Set<string>();
    let cursor = '';
    for (let scan = 0; scan < 3; scan++) {
      const page = ids.filter((id) => id > cursor).slice(0, 3);
      for (const id of page) seen.add(id);
      cursor = nextScanCursor(page, 3);
    }
    expect(seen.size).toBe(7);
    expect(cursor).toBe('');
  });
});
