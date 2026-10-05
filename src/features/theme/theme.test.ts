import { describe, expect, test } from 'bun:test';
import { parsePreference, toggleTheme } from './theme';

describe('parsePreference', () => {
  test('sem escolha guardada, ou com lixo, é o automático', () => {
    expect(parsePreference(null)).toBe('light');
    expect(parsePreference(undefined)).toBe('light');
    expect(parsePreference('azul')).toBe('light');
    expect(parsePreference('system')).toBe('system');
  });

  test('claro e escuro valem como estão', () => {
    expect(parsePreference('light')).toBe('light');
    expect(parsePreference('dark')).toBe('dark');
  });
});

describe('toggleTheme', () => {
  test('do claro, ativa o escuro', () => {
    expect(toggleTheme('light')).toBe('dark');
  });

  test('do escuro, ativa o claro', () => {
    expect(toggleTheme('dark')).toBe('light');
  });
});
