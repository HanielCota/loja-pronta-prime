import { describe, expect, test } from 'bun:test';
import { PRODUCTS } from '@/features/products/catalog';
import { firstName } from '@/features/products/names';
import { displayedPhase } from '@/features/products/store-phase';
import { ONBOARDING_BLOCKS, ONBOARDING_QUESTIONS } from './onboarding';
import { PRODUCT_IDS } from './products';
import { STORE_PHASES } from './store-phases';

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
});

describe('firstName', () => {
  test('primeiro nome pra saudação', () => {
    expect(firstName('Ana Souza')).toBe('Ana');
    expect(firstName('  Maria   da Silva ')).toBe('Maria');
    expect(firstName('Ana')).toBe('Ana');
    expect(firstName('')).toBe('');
    expect(firstName('   ')).toBe('');
  });
});

describe('displayedPhase', () => {
  test('conversa enviada com a loja ainda na fase 1: ela já vê a fase 2', () => {
    expect(displayedPhase(1, true)).toBe(2);
    expect(displayedPhase(1, false)).toBe(1);
    expect(displayedPhase(3, true)).toBe(3);
  });
});
