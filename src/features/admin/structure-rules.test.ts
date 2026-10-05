import { describe, expect, test } from 'bun:test';
import { learningSlugFromTitle } from './structure-rules';

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
