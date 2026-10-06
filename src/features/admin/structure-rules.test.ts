import { describe, expect, test } from 'bun:test';
import { learningSlugFromTitle, swapWithNeighbor } from './structure-rules';

describe('endereços do conteúdo do SLL', () => {
  test('remove acentos e organiza palavras para links', () => {
    expect(learningSlugFromTitle('Sua loja no ar em 7 dias')).toBe('sua-loja-no-ar-em-7-dias');
  });

  test('limpa pontuação e garante um valor quando não há letras', () => {
    expect(learningSlugFromTitle('!!!')).toBe('conteudo');
  });

  test('limita endereços longos sem deixar hífen no fim', () => {
    expect(learningSlugFromTitle(`${'a'.repeat(79)} B`)).toBe('a'.repeat(79));
  });
});

describe('swapWithNeighbor', () => {
  test('troca com o vizinho e renumera a lista', () => {
    expect(swapWithNeighbor(['a', 'b', 'c'], 'b', 'up')).toEqual([
      { id: 'b', position: 0 },
      { id: 'a', position: 1 },
      { id: 'c', position: 2 },
    ]);
    expect(swapWithNeighbor(['a', 'b', 'c'], 'b', 'down')).toEqual([
      { id: 'a', position: 0 },
      { id: 'c', position: 1 },
      { id: 'b', position: 2 },
    ]);
  });

  test('não move além das pontas nem item que não está na lista', () => {
    expect(swapWithNeighbor(['a', 'b'], 'a', 'up')).toBeNull();
    expect(swapWithNeighbor(['a', 'b'], 'b', 'down')).toBeNull();
    expect(swapWithNeighbor(['a', 'b'], 'x', 'up')).toBeNull();
  });
});
