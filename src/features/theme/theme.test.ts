import { describe, expect, test } from 'bun:test';
import { parsePreference } from './theme';

describe('parsePreference', () => {
  test('sem escolha guardada, ou com lixo, é o automático', () => {
    expect(parsePreference(null)).toBe('system');
    expect(parsePreference(undefined)).toBe('system');
    expect(parsePreference('azul')).toBe('system');
    expect(parsePreference('system')).toBe('system');
  });

  test('claro e escuro valem como estão', () => {
    expect(parsePreference('light')).toBe('light');
    expect(parsePreference('dark')).toBe('dark');
  });
});
