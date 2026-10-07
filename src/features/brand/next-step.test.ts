import { describe, expect, test } from 'bun:test';
import { nextStepAfterBrand } from './next-step';
import { SHOPEE_CONNECT_PATH, SHOPEE_PATH } from '@/config/shopee';

describe('destino depois da marca', () => {
  test('oferece a conta apenas na fase 3 e a explicação da conexão na fase 4', () => {
    expect(nextStepAfterBrand(3).href).toBe(SHOPEE_PATH);
    expect(nextStepAfterBrand(3).text).toContain('publicação pela plataforma, que está em breve');
    expect(nextStepAfterBrand(4).href).toBe(SHOPEE_CONNECT_PATH);
    expect(nextStepAfterBrand(4).text).toContain('em preparação');
  });
  test('quem já passou dessas fases volta ao painel, sem entrar em um redirecionamento', () => {
    for (const phase of [1, 2, 5, 6, 7])
      expect(nextStepAfterBrand(phase).href).toBe('/loja-pronta');
  });
});
