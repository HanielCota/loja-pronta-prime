import { describe, expect, test } from 'bun:test';
import { trustedProxyHopsSchema } from './trusted-proxy-hops';

describe('TRUSTED_PROXY_HOPS', () => {
  const production = trustedProxyHopsSchema(true);
  const development = trustedProxyHopsSchema(false);

  test('accepts whole numbers from 0 to 5, trimming spaces', () => {
    expect(production.parse('0')).toBe(0);
    expect(production.parse(' 1 ')).toBe(1);
    expect(production.parse('5')).toBe(5);
  });

  test('empty or blank counts as missing: required in production, 1 elsewhere', () => {
    for (const value of [undefined, '', '   ', '\t'])
      expect(production.safeParse(value).success).toBe(false);
    for (const value of [undefined, '', '   ']) expect(development.parse(value)).toBe(1);
  });

  test('rejects values that a plain number conversion would silently accept', () => {
    for (const value of ['6', '-1', '1.5', '1.0', '0x1', '1e0', 'NaN', 'Infinity', 'null', 'um'])
      expect(production.safeParse(value).success).toBe(false);
  });
});
