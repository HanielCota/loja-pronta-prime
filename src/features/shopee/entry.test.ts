import { expect, test } from 'bun:test';
import { shopeeConnectionPath, shopeeEntry } from './entry';

test('somente duas áreas podem receber o retorno da autorização', () => {
  expect(shopeeConnectionPath(shopeeEntry('sll'))).toBe('/sll/minhas-lojas/conectar');
  for (const value of [null, undefined, 'https://example.invalid', '//example.invalid', 'admin']) {
    expect(shopeeConnectionPath(shopeeEntry(value))).toBe('/loja-pronta/shopee/conectar');
  }
});
