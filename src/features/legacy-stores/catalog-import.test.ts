import { expect, test } from 'bun:test';
import { catalogReviewSchema, recoveredImageKey, recoveredSelectionSchema } from './catalog-import';

const id = '00000000-0000-4000-8000-000000000001';
test('rejects empty or oversized imports and deduplicates selection identifiers', () => {
  expect(recoveredSelectionSchema.safeParse({ storeId: id, productIds: [] }).success).toBe(false);
  expect(
    recoveredSelectionSchema.safeParse({ storeId: id, productIds: Array(51).fill(id) }).success,
  ).toBe(false);
  expect(recoveredSelectionSchema.parse({ storeId: id, productIds: [id, id] }).productIds).toEqual([
    id,
  ]);
  expect(recoveredSelectionSchema.safeParse({ storeId: 'other', productIds: [id] }).success).toBe(
    false,
  );
});
test('accepts decimal currency without trusting separators, exponents or negative values', () => {
  const input = {
    productId: id,
    revision: '1',
    title: 'Shoes',
    description: 'Product details',
    price: '49,90',
  };
  expect(catalogReviewSchema.parse(input).price).toBe(4990);
  for (const price of ['0', '-1', '1e5', '1.200,90', 'Infinity', '12,345'])
    expect(catalogReviewSchema.safeParse({ ...input, price }).success).toBe(false);
  expect(catalogReviewSchema.safeParse({ ...input, title: ' ' }).success).toBe(false);
});
test('private media keys must match the complete verified content digest', () => {
  const sha256 = 'a'.repeat(64),
    key = `recovery/shopee/images/sha256/${sha256}`;
  expect(recoveredImageKey({ sha256, key })).toBe(key);
  expect(recoveredImageKey({ sha256, key: 'logos/another-account/private.png' })).toBeNull();
  expect(recoveredImageKey({ sha256: '../secret', key })).toBeNull();
});
