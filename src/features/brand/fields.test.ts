import { describe, expect, test } from 'bun:test';
import { BRAND_DESCRIPTION_MAX } from '@/config/brand';
import { parseBrandDescription } from './fields';

describe('brand description', () => {
  test('missing, blank or invisible-only text is asked again', () => {
    for (const input of [null, undefined, '', '   ', '\u200B', '\uFEFF \u00A0', '\r\n'])
      expect(parseBrandDescription(input).ok).toBe(false);
  });

  test('line breaks count once, as the field counter does', () => {
    const line = 'a'.repeat(99);
    const text = Array.from({ length: 5 }, () => line).join('\r\n');
    expect(text.replace(/\r\n/g, '\n')).toHaveLength(BRAND_DESCRIPTION_MAX - 1);
    const parsed = parseBrandDescription(text);
    expect(parsed).toEqual({ ok: true, value: text.replace(/\r\n/g, '\n') });
  });

  test('text over the limit is refused with the visible count', () => {
    const parsed = parseBrandDescription('a'.repeat(BRAND_DESCRIPTION_MAX + 1));
    expect(parsed.ok).toBe(false);
  });
});
