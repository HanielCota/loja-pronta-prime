import { expect, test } from 'bun:test';
import { cleanTypedText, hasControlCharacters } from './text';

test('reconhece controles em qualquer posição sem rejeitar acentos ou espaços', () => {
  for (const code of [0, 9, 10, 13, 31, 127])
    expect(hasControlCharacters(`Ana${String.fromCharCode(code)}Paula`)).toBe(true);
  expect(hasControlCharacters('Ana Paula — ação 🌷')).toBe(false);
  expect(hasControlCharacters('')).toBe(false);
});

test('cleanTypedText: invisible-only and blank text become empty', () => {
  for (const value of ['', '   ', '\u200B', '\uFEFF', '\u00A0', ' \u200B\u200D\u00A0\n\t'])
    expect(cleanTypedText(value)).toBe('');
});

test('cleanTypedText: keeps visible text, joins CRLF and maps NBSP to a space', () => {
  expect(cleanTypedText('  Loja\r\nda Ana\u200B ')).toBe('Loja\nda Ana');
  expect(cleanTypedText('a\rb')).toBe('a\nb');
  expect(cleanTypedText('Ana\u00A0Paula')).toBe('Ana Paula');
  expect(cleanTypedText('0')).toBe('0');
  expect(cleanTypedText('ação 🌷')).toBe('ação 🌷');
});

test('cleanTypedText: keeps emoji joiners inside visible text', () => {
  expect(cleanTypedText('Loja 👩\u200D💻')).toBe('Loja 👩\u200D💻');
  expect(cleanTypedText('\u200D\u200E')).toBe('');
});
