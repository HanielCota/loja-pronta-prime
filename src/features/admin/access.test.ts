import { describe, expect, test } from 'bun:test';
import { hasAdminRole } from './access';

describe('hasAdminRole', () => {
  test('permite somente a função admin', () => {
    expect(hasAdminRole('admin')).toBe(true);
    expect(hasAdminRole('user')).toBe(false);
    expect(hasAdminRole(null)).toBe(false);
    expect(hasAdminRole(undefined)).toBe(false);
  });

  test('reconhece admin quando há mais de uma função', () => {
    expect(hasAdminRole('user, admin')).toBe(true);
    expect(hasAdminRole('administrator')).toBe(false);
  });
});
