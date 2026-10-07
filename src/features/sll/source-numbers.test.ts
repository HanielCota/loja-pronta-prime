import { describe, expect, test } from 'bun:test';
import {
  SLL_LIBRARY_SOURCE_DURATION_MINUTES,
  SLL_LIBRARY_SOURCE_NUMBERS,
  sllLibrarySourceDurationMinutes,
  sllLibrarySourceNumber,
} from './source-numbers';

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

  test('só importa as durações visíveis na fonte', () => {
    expect(sllLibrarySourceDurationMinutes('como-gerar-etiqueta')).toBe(8);
    expect(sllLibrarySourceDurationMinutes('desconto')).toBe(8);
    expect(sllLibrarySourceDurationMinutes('oferta-relampago-da-loja')).toBe(4);
    expect(sllLibrarySourceDurationMinutes('cupons')).toBe(8);
    expect(sllLibrarySourceDurationMinutes('duplicando-anuncios-do-jeito-certo')).toBe(3);
    expect(sllLibrarySourceDurationMinutes('videos-shopee-videos')).toBe(6);
    expect(sllLibrarySourceDurationMinutes('primeiras-avaliacoes')).toBe(13);
    expect(sllLibrarySourceDurationMinutes('chat-de-ouro-avaliacoes-reputacao')).toBe(6);
    expect(sllLibrarySourceDurationMinutes('informacoes-gerenciais')).toBe(9);
    expect(sllLibrarySourceDurationMinutes('decoracao-da-loja')).toBeNull();
    expect(sllLibrarySourceDurationMinutes('toString')).toBeNull();
    expect(Object.keys(SLL_LIBRARY_SOURCE_DURATION_MINUTES)).toHaveLength(9);
  });
});
