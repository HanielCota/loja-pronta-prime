import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_DISPLAY,
  DISPLAY_SCRIPT,
  TEXT_SIZES,
  displayAttributes,
  displayStorage,
  parseDisplay,
  type DisplaySettings,
} from './display';

const ALL_ON: DisplaySettings = { text: 'maior', reduceMotion: true, moreContrast: true };

/** Roda o script do head com um navegador de mentira e devolve os atributos que ele pôs. */
function runScript(stored: Record<string, string>): Record<string, string> {
  const attributes: Record<string, string> = {};
  const document = {
    documentElement: { setAttribute: (name: string, value: string) => (attributes[name] = value) },
  };
  const localStorage = { getItem: (key: string) => stored[key] ?? null };
  new Function('document', 'localStorage', DISPLAY_SCRIPT)(document, localStorage);
  return attributes;
}

describe('ajustes de leitura', () => {
  test('sem nada guardado (ou com lixo), o padrão', () => {
    expect(parseDisplay(() => null)).toEqual(DEFAULT_DISPLAY);
    expect(parseDisplay(() => 'qualquer')).toEqual(DEFAULT_DISPLAY);
    expect(parseDisplay(() => '__proto__')).toEqual(DEFAULT_DISPLAY);
  });

  test('guardar e ler de volta dá o mesmo ajuste', () => {
    for (const settings of [DEFAULT_DISPLAY, ALL_ON, { ...DEFAULT_DISPLAY, text: 'grande' }]) {
      const stored = displayStorage(settings as DisplaySettings);
      expect(parseDisplay((key) => stored[key] ?? null)).toEqual(settings as DisplaySettings);
    }
  });

  test('o padrão não guarda nada nem põe atributo', () => {
    expect(Object.values(displayStorage(DEFAULT_DISPLAY)).every((value) => value === null)).toBe(
      true,
    );
    expect(Object.values(displayAttributes(DEFAULT_DISPLAY)).every((value) => value === null)).toBe(
      true,
    );
  });

  test('o script do head põe os mesmos atributos que a tela, e ignora lixo', () => {
    const stored = displayStorage(ALL_ON) as Record<string, string>;
    expect(runScript(stored)).toEqual(displayAttributes(ALL_ON) as Record<string, string>);
    expect(
      runScript({ 'display-text': 'enorme', 'display-motion': 'x', 'display-contrast': '1' }),
    ).toEqual({});
  });

  test('quem guardou o antigo "Pequeno" volta ao Normal', () => {
    const stored: Record<string, string> = { 'display-text': 'pequeno' };
    expect(parseDisplay((key) => stored[key] ?? null)).toEqual(DEFAULT_DISPLAY);
    expect(runScript(stored)).toEqual({});
  });

  test('sem armazenamento no navegador, o script não quebra a página', () => {
    const blocked = {
      getItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(() =>
      new Function('document', 'localStorage', DISPLAY_SCRIPT)({}, blocked),
    ).not.toThrow();
  });

  test('cada tamanho de texto tem a sua base no CSS', () => {
    const css = readFileSync('src/app/globals.css', 'utf8').replace(/\s+/g, ' ');
    for (const [size, { scale }] of Object.entries(TEXT_SIZES)) {
      if (size === 'normal') continue;
      expect(css).toContain(`html[data-text='${size}'] { font-size: ${scale}; }`);
    }
  });
});
