import { describe, expect, test } from 'bun:test';
import { hasAdminRole, isStudentRole } from './access';

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

describe('isStudentRole', () => {
  test('aceita só a função user ou nenhuma', () => {
    expect(isStudentRole('user')).toBe(true);
    expect(isStudentRole(null)).toBe(true);
    expect(isStudentRole(undefined)).toBe(true);
  });

  test('recusa admin e funções personalizadas', () => {
    expect(isStudentRole('admin')).toBe(false);
    expect(isStudentRole('user,admin')).toBe(false);
    expect(isStudentRole('suporte')).toBe(false);
  });
});
