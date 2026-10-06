import { describe, expect, test } from 'bun:test';
import { SLL_LIBRARY_SOURCE_NUMBERS, sllLibrarySourceNumber } from './source-numbers';

describe('numeração de origem da Biblioteca SLL', () => {
  test('preserva a numeração mostrada pela fonte sem preencher a lacuna 41', () => {
    expect(sllLibrarySourceNumber('desempenho-da-conta')).toBe(40);
    expect(sllLibrarySourceNumber('decoracao-da-loja')).toBe(42);
    expect(sllLibrarySourceNumber('configuracoes-da-loja')).toBe(43);
    expect(sllLibrarySourceNumber('aula-41')).toBeNull();
    expect(Object.keys(SLL_LIBRARY_SOURCE_NUMBERS)).toHaveLength(19);
  });

  test('mantém números de origem separados da posição de apresentação', () => {
    expect(Object.values(SLL_LIBRARY_SOURCE_NUMBERS).toSorted((a, b) => a - b)).toEqual([
      18, 19, 20, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 38, 39, 40, 42, 43, 44,
    ]);
  });
});
