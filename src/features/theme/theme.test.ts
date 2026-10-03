import { describe, expect, test } from 'bun:test';
import { parsePreference, resolveTheme, THEME_INIT_SCRIPT } from './theme';

describe('parsePreference', () => {
  test('sem escolha guardada, ou com lixo, é o automático', () => {
    expect(parsePreference(null)).toBe('system');
    expect(parsePreference('azul')).toBe('system');
    expect(parsePreference('system')).toBe('system');
  });

  test('claro e escuro valem como estão', () => {
    expect(parsePreference('light')).toBe('light');
    expect(parsePreference('dark')).toBe('dark');
  });
});

describe('resolveTheme', () => {
  test('o automático segue o aparelho', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  test('um tema fixo ignora o aparelho', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

/** Roda o script do começo da página num "navegador" de mentira e diz se ele pôs o escuro. */
function runInitScript(stored: string | null, systemDark: boolean, storageFails = false): boolean {
  const classes = new Set<string>();
  const localStorage = {
    getItem: () => {
      if (storageFails) throw new Error('bloqueado');
      return stored;
    },
  };
  const matchMedia = () => ({ matches: systemDark });
  const document = { documentElement: { classList: { add: (name: string) => classes.add(name) } } };
  new Function('localStorage', 'matchMedia', 'document', THEME_INIT_SCRIPT)(
    localStorage,
    matchMedia,
    document,
  );
  return classes.has('dark');
}

describe('THEME_INIT_SCRIPT', () => {
  const cases: [string | null, boolean][] = [
    [null, true],
    [null, false],
    ['system', true],
    ['light', true],
    ['dark', false],
    ['lixo', true],
  ];
  for (const [stored, systemDark] of cases) {
    test(`segue a mesma regra do resolveTheme (guardado ${stored}, aparelho escuro ${systemDark})`, () => {
      const expected = resolveTheme(parsePreference(stored), systemDark);
      expect(runInitScript(stored, systemDark)).toBe(expected === 'dark');
    });
  }

  test('sem acesso ao armazenamento, não quebra e fica claro', () => {
    expect(runInitScript(null, true, true)).toBe(false);
  });
});
