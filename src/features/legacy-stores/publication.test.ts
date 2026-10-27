import { expect, test } from 'bun:test';
import { buildProductVariations } from '@/features/assistant/supplier-offer';
import type { PublicationPayload } from '@/features/assistant/model';
import { randomUUID } from 'node:crypto';
import {
  recoveredPublicationOffer,
  recoveredPublicationFingerprint,
  publicationLocked,
  recoveredConfirmationSchema,
  recoveredBarcodes,
  validRecoveredBarcode,
  activeRecoveredAttributes,
  assertRecoveredMarketplace,
  recoveredListingPayload,
  type PublicationContext,
} from './publication';
import type { RestoredProduct } from './recovery';

const context: PublicationContext = {
  version: 'test',
  shopName: 'Test shop',
  categories: [{ id: 10, name: 'Shoes' }],
  categoryId: 10,
  channels: [{ id: 20, name: 'Delivery' }],
  attributes: [{ id: 30, name: 'Material', mandatory: true, values: [{ id: 40, name: 'Cotton' }] }],
  brands: [{ id: 0, name: 'No brand' }],
};
const product: RestoredProduct = {
  legacyProductId: randomUUID(),
  baseProductId: 'test',
  title: 'Test shoes',
  description: 'Test description',
  priceCents: 4990,
  sku: 'R-test',
  images: [
    {
      key: `recovery/shopee/images/sha256/${'a'.repeat(64)}`,
      sha256: 'a'.repeat(64),
      bytes: 100,
      contentType: 'image/png',
    },
  ],
  categoryId: 10,
  brandId: 0,
  weightKg: null,
  dimensionsCm: null,
  axes: [],
  variants: [
    { sku: 'R-test-35', options: { Size: '35' }, supplierSku: null },
    { sku: 'R-test-36', options: { Size: '36' }, supplierSku: null },
  ],
  publicationReady: false,
  publicationBlockers: [],
};
function form() {
  const value = new FormData();
  const values = {
    currentData: 'confirmed',
    'cost-0': '20,00',
    'price-0': '49,90',
    'stock-0': '3',
    'cost-1': '21.00',
    'price-1': '59,90',
    'stock-1': '0',
    weightGrams: '500',
    length: '20',
    width: '12',
    height: '8',
    brandId: '0',
    channelId: '20',
    'attribute-30': '40',
  };
  for (const [key, item] of Object.entries(values)) value.set(key, item);
  return value;
}
test('requires explicit current offers for every preserved variation and real packaging', () => {
  const now = new Date();
  const offer = recoveredPublicationOffer(product, context, form(), now);
  expect(offer.stock).toBe(3);
  expect(offer.variants.map((row) => [row.sku, row.priceCents, row.stock])).toEqual([
    ['R-test-35', 4990, 3],
    ['R-test-36', 5990, 0],
  ]);
  expect(offer.marketplace?.attributes).toEqual([{ id: 30, values: [{ id: 40, name: 'Cotton' }] }]);
  for (const key of ['currentData', 'weightGrams', 'cost-1', 'channelId', 'attribute-30']) {
    const missing = form();
    missing.delete(key);
    expect(() => recoveredPublicationOffer(product, context, missing, now)).toThrow();
  }
  for (const [key, value] of [
    ['stock-0', '0'],
    ['price-0', '10,00'],
    ['stock-1', '-1'],
    ['brandId', '999'],
    ['attribute-30', '999'],
  ]) {
    const invalid = form();
    invalid.set(key!, value!);
    expect(() => recoveredPublicationOffer(product, context, invalid, now)).toThrow();
  }
  const sparse = structuredClone(product);
  sparse.variants = [
    { ...sparse.variants[0]!, options: { Size: '35', Color: 'Blue' } },
    { ...sparse.variants[1]!, options: { Size: '36', Color: 'Red' } },
  ];
  expect(() => recoveredPublicationOffer(sparse, context, form(), now)).toThrow();
});
test('confirmation fingerprints cover destination, packaging, all offers and revision', () => {
  const offer = recoveredPublicationOffer(product, context, form(), new Date());
  const snapshot = {
    importId: randomUUID(),
    applicationId: 'live:1',
    shopId: 123,
    context,
    intent: { offer, productHash: 'a', sourceHash: 'b', revision: 1 },
    expiresAt: new Date(Date.now() + 1000),
  };
  const hash = recoveredPublicationFingerprint(snapshot);
  for (const changed of [
    { ...snapshot, shopId: 124 },
    { ...snapshot, applicationId: 'sandbox:1' },
    { ...snapshot, intent: { ...snapshot.intent, revision: 2 } },
    { ...snapshot, intent: { ...snapshot.intent, offer: { ...offer, stock: 4 } } },
  ])
    expect(recoveredPublicationFingerprint(changed)).not.toBe(hash);
  expect(publicationLocked('review')).toBe(false);
  expect(publicationLocked('pending')).toBe(true);
  expect(publicationLocked('unknown')).toBe(true);
});

test('a confirmation requires an explicit consent value', () => {
  const value = { productId: randomUUID(), fingerprint: 'a'.repeat(64) };
  expect(recoveredConfirmationSchema.safeParse(value).success).toBe(false);
  expect(recoveredConfirmationSchema.safeParse({ ...value, confirmation: 'on' }).success).toBe(
    false,
  );
  expect(
    recoveredConfirmationSchema.safeParse({ ...value, confirmation: 'confirmed' }).success,
  ).toBe(true);
});

test('current category rules validate conditional fields, barcodes and stock payloads', () => {
  const limits = {
    title: { min: 1, max: 120 },
    description: { min: 1, max: 5000 },
    price: { min: 1, max: 1000000 },
    stock: { min: 0, max: 1000000 },
    images: { min: 1, max: 9 },
    gtin: 'Flexible' as const,
  };
  const current = { ...context, limits };
  const input = form();
  expect(() => recoveredPublicationOffer(product, current, input, new Date())).toThrow();
  input.set('barcode-0', '4006381333931');
  input.set('noBarcode-1', 'confirmed');
  const offer = recoveredPublicationOffer(product, current, input, new Date());
  const barcodes = recoveredBarcodes(offer, current, input);
  expect(barcodes).toEqual({ 'R-test-35': '4006381333931', 'R-test-36': '00' });
  expect(validRecoveredBarcode('4006381333931')).toBe(true);
  expect(validRecoveredBarcode('4006381333932')).toBe(false);
  expect(validRecoveredBarcode('00000000')).toBe(false);
  expect(() =>
    recoveredBarcodes(offer, { ...current, limits: { ...limits, gtin: 'Mandatory' } }, input),
  ).toThrow();
  input.set('barcode-1', '5901234123457');
  input.delete('noBarcode-1');
  expect(() =>
    recoveredPublicationOffer(
      product,
      { ...current, limits: { ...limits, gtin: 'Mandatory' } },
      input,
      new Date(),
    ),
  ).not.toThrow();
  const child = {
    id: 31,
    name: 'Fabric type',
    mandatory: true,
    dependencies: [{ attributeId: 30, valueId: 40 }],
    values: [{ id: 41, name: 'Woven' }],
  };
  const conditional = { ...current, attributes: [...current.attributes, child] };
  expect(activeRecoveredAttributes(conditional, (id) => (id === 30 ? '40' : ''))).toHaveLength(2);
  expect(() => recoveredPublicationOffer(product, conditional, input, new Date())).toThrow();
  input.set('attribute-31', '41');
  const selected = recoveredPublicationOffer(product, conditional, input, new Date());
  expect(selected.marketplace?.attributes).toHaveLength(2);
  expect(() =>
    assertRecoveredMarketplace(
      selected,
      { ...conditional, unsupported: ['Size chart required'] },
      barcodes,
    ),
  ).toThrow();
  expect(() =>
    assertRecoveredMarketplace(
      offer,
      { ...current, limits: { ...limits, title: { min: 1, max: 2 } } },
      barcodes,
    ),
  ).toThrow();
  const normalized = {
    item_sku: offer.sku,
    item_name: offer.title,
    description: offer.description,
    category_id: 10,
    original_price: 49.9,
    normal_stock: 3,
    weight: 0.5,
    condition: 'NEW',
    item_status: 'NORMAL',
    image: { image_id_list: ['actual-upload-id'] },
    dimension: { package_length: 20, package_width: 12, package_height: 8 },
    logistic_info: [{ logistic_id: 20, enabled: true, is_free: false }],
    attribute_list: [],
    brand: { brand_id: 0, original_brand_name: '' },
    variations: buildProductVariations(offer),
  } as PublicationPayload;
  const payload = recoveredListingPayload(normalized, {
    offer,
    barcodes,
    revision: 1,
    productHash: 'a',
    sourceHash: 'b',
  });
  expect(payload.base.seller_stock).toEqual([{ stock: 3 }]);
  expect(payload.base.gtin_code).toBe('4006381333931');
  expect('normal_stock' in payload.base).toBe(false);
  expect(payload.variations?.model.map((model) => model.seller_stock)).toEqual([
    [{ stock: 3 }],
    [{ stock: 0 }],
  ]);
  expect(payload.variations?.model[1]?.gtin_code).toBe('00');
});

test('conditional attribute branches never render ambiguous duplicate field identifiers', () => {
  const duplicate = {
    ...context,
    attributes: [
      ...context.attributes,
      { ...context.attributes[0]!, values: [{ id: 99, name: 'Different' }] },
    ],
  };
  const fields = activeRecoveredAttributes(duplicate, () => '');
  expect(fields).toHaveLength(1);
  expect(fields[0]?.supported).toBe(false);
});
