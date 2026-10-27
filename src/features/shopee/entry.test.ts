import { expect, test } from 'bun:test';
import { shopeeConnectionPath, shopeeEntry, shopeeEntryProduct } from './entry';

test('only known areas can receive authorization callbacks', () => {
  expect(shopeeConnectionPath(shopeeEntry('recovered'))).toBe(
    '/loja-pronta/produtos/recovered/connect',
  );
  expect(shopeeEntryProduct('recovered')).toBe('loja-pronta');
  expect(shopeeConnectionPath(shopeeEntry('sll'))).toBe('/sll/minhas-lojas/conectar');
  for (const value of [null, undefined, 'https://example.invalid', '//example.invalid', 'admin']) {
    expect(shopeeConnectionPath(shopeeEntry(value))).toBe('/loja-pronta/shopee/conectar');
  }
});
