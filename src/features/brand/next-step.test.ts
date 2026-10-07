import { describe, expect, test } from 'bun:test';
import { nextStepAfterBrand } from './next-step';
import { SHOPEE_BRAND_PATH, SHOPEE_PATH } from '@/config/shopee';

describe('destino depois da marca', () => {
  test('oferece a conta apenas na fase 3 e, na 4, colocar a marca na Shopee', () => {
    expect(nextStepAfterBrand(3).href).toBe(SHOPEE_PATH);
    // Na 3, já avisa o que fazer com o logo baixado.
    expect(nextStepAfterBrand(3).text).toContain('colocar seu logo');
    expect(nextStepAfterBrand(4).href).toBe(SHOPEE_BRAND_PATH);
  });
  test('quem já passou dessas fases volta ao painel, sem entrar em um redirecionamento', () => {
    for (const phase of [1, 2, 5, 6, 7])
      expect(nextStepAfterBrand(phase).href).toBe('/loja-pronta');
  });
});
