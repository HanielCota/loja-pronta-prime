import { expect, test } from 'bun:test';
import { formatBRL, formatCentsBRL } from './format-money';

// O Intl separa "R$" do número com espaço não separável; o teste compara sem depender disso.
const plain = (text: string) => text.replace(/\s/g, ' ');

test('formata reais no padrão brasileiro', () => {
  expect(plain(formatBRL(19.9))).toBe('R$ 19,90');
  expect(plain(formatBRL(1234.5))).toBe('R$ 1.234,50');
});

test('centavos viram reais sem erro de arredondamento', () => {
  expect(plain(formatCentsBRL(1990))).toBe('R$ 19,90');
  expect(plain(formatCentsBRL(5))).toBe('R$ 0,05');
  expect(formatCentsBRL(1990)).toBe(formatBRL(19.9));
});
