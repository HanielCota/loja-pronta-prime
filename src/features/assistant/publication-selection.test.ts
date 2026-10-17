import { expect, test } from 'bun:test';
import { publicationOfferFingerprint, publicationSelectionSchema } from './publication-selection';
import { publicationPayloadSchema } from './model';

const payload = publicationPayloadSchema.parse({
  item_name: 'Produto',
  description: 'Descrição',
  category_id: 10,
  item_sku: 'sku',
  original_price: 20,
  normal_stock: 2,
  weight: 0.2,
  condition: 'NEW',
  item_status: 'NORMAL',
  image: { image_id_list: ['image-id'] },
  dimension: { package_length: 10, package_width: 10, package_height: 10 },
  logistic_info: [{ logistic_id: 1, enabled: true, is_free: false }],
  brand: { brand_id: 0, original_brand_name: 'NoBrand' },
});
const owner = { userId: 'owner', shopId: 123, applicationId: 'live:123' };
test('a confirmação muda com a oferta ou a loja e ignora a ordem das propriedades do JSON', () => {
  const original = publicationOfferFingerprint(payload, owner);
  expect(
    publicationOfferFingerprint(
      Object.fromEntries(Object.entries(payload).toReversed()) as typeof payload,
      owner,
    ),
  ).toBe(original);
  for (const changed of [
    { ...payload, original_price: 25 },
    { ...payload, normal_stock: 3 },
    { ...payload, category_id: 20 },
  ])
    expect(publicationOfferFingerprint(changed, owner)).not.toBe(original);
  for (const changed of [
    { ...owner, userId: 'other' },
    { ...owner, shopId: 456 },
    { ...owner, applicationId: 'sandbox:123' },
  ])
    expect(publicationOfferFingerprint(payload, changed)).not.toBe(original);
});
test('uma seleção sem a confirmação da oferta não é aceita', () => {
  expect(publicationSelectionSchema.safeParse(['supplier', 'sku']).success).toBe(false);
  expect(
    publicationSelectionSchema.safeParse([
      'supplier',
      'sku',
      publicationOfferFingerprint(payload, owner),
    ]).success,
  ).toBe(true);
});
