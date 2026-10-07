import { expect, test } from 'bun:test';
import { hasControlCharacters } from './text';

test('reconhece controles em qualquer posição sem rejeitar acentos ou espaços', () => {
  for (const code of [0, 9, 10, 13, 31, 127])
    expect(hasControlCharacters(`Ana${String.fromCharCode(code)}Paula`)).toBe(true);
  expect(hasControlCharacters('Ana Paula — ação 🌷')).toBe(false);
  expect(hasControlCharacters('')).toBe(false);
});
