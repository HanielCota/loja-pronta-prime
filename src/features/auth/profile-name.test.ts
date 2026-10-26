import { describe, expect, test } from 'bun:test';
import { profileNameSchema } from './schemas';

describe('preferred name', () => {
  test('missing, blank or invisible-only names are refused', () => {
    for (const name of [undefined, null, '', '   ', '\u200B', '\u00A0\uFEFF'])
      expect(profileNameSchema.safeParse({ name }).success).toBe(false);
  });

  test('visible names are kept, trimmed and limited to 30 characters', () => {
    expect(profileNameSchema.parse({ name: '  Ana\u200B ' }).name).toBe('Ana');
    expect(profileNameSchema.safeParse({ name: 'a'.repeat(31) }).success).toBe(false);
  });
});
