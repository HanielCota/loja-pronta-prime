import { describe, expect, test } from 'bun:test';
import { PRODUCTS } from '@/features/products/catalog';
import { ONBOARDING_BLOCKS, ONBOARDING_QUESTIONS } from './onboarding';
import { PRODUCT_IDS } from './products';
import { STORE_PHASES } from './store-phases';
import { DATA_CONTROLLER, PRIVACY_EMAIL, TEAM_WHATSAPP } from './support';

describe('configuração', () => {
  test('7 fases da loja (o banco confere 1 a 7 com essa mesma lista)', () => {
    expect(STORE_PHASES).toHaveLength(7);
    const titles = STORE_PHASES.map((phase) => phase.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  test('todo produto tem catálogo e caminho próprio', () => {
    expect(Object.keys(PRODUCTS).toSorted()).toEqual(PRODUCT_IDS.toSorted());
    const paths = PRODUCT_IDS.map((id) => PRODUCTS[id].path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test('toda pergunta da conversa está numa parte conhecida', () => {
    for (const question of ONBOARDING_QUESTIONS) {
      expect(Object.keys(ONBOARDING_BLOCKS)).toContain(question.block);
    }
  });

  test('support WhatsApp is empty or contains 10 to 11 digits including the area code', () => {
    if (TEAM_WHATSAPP) expect(TEAM_WHATSAPP).toMatch(/^[1-9]\d{9,10}$/);
  });

  test('contato da privacidade: um email e o CNPJ formatado', () => {
    expect(PRIVACY_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/);
    expect(DATA_CONTROLLER.cnpj).toMatch(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/);
  });
});
