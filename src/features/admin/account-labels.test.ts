import { expect, test } from 'bun:test';
import { productLabel } from './account-labels';

test('os produtos usam os nomes curtos do painel', () => {
  expect(productLabel('sll')).toBe('SLL');
  expect(productLabel('loja-pronta')).toBe('Loja Pronta');
});
