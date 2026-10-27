import { expect, test } from 'bun:test';
import {
  buildRecoveryCatalog,
  productIdentity,
  recoverHistoricalProduct,
  recoveryHash,
  legacyRecordHash,
  validateRecoveredItem,
  type HistoricalProduct,
  type RecoverySource,
  type RecoveredItem,
} from './recovery';

const body =
  'Comfortable shoes with a soft sole. The product is available in two sizes, with the same construction and materials for every option.';
const sha = 'a'.repeat(64);
const url = 'https://cf.shopee.com.br/file/image';
const branded = (name: string, text = body) =>
  `Você está na ${name} — sua loja de confiança.\n\n${name}\n\n${text}\n\n${name} — sempre disponível pra você.`;
function item(overrides: Partial<RecoveredItem> = {}): RecoveredItem {
  return {
    item_id: 100,
    item_name: 'Comfortable shoes — Store A',
    description: branded('Store A'),
    category_id: 10,
    item_status: 'NORMAL',
    has_model: true,
    weight: '0.5',
    dimension: { package_length: 20, package_width: 12, package_height: 8 },
    image: { image_url_list: [url] },
    recovered_models: {
      tier_variation: [{ name: 'Size', option_list: [{ option: '35' }, { option: '36' }] }],
      model: [
        { model_id: 1, tier_index: [0], model_sku: 'SHOE-35' },
        { model_id: 2, tier_index: [1], model_sku: 'SHOE-36' },
      ],
    },
    ...overrides,
  };
}
function source(items = [item()], shopId = 5): RecoverySource {
  return {
    shopId,
    shopName: 'Store A',
    capturedAt: '2026-10-26T10:00:00Z',
    catalogSha256: sha,
    items,
    images: {
      shopId,
      catalogSha256: sha,
      assets: [
        {
          url,
          sha256: sha,
          key: `recovery/shopee/images/sha256/${sha}`,
          bytes: 100,
          contentType: 'image/jpeg',
          checksumVerified: true,
        },
      ],
    },
  };
}
function legacy(overrides: Partial<HistoricalProduct> = {}): HistoricalProduct {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    storeId: '00000000-0000-4000-8000-000000000002',
    userId: 'owner',
    shopId: '99',
    storeNames: ['Store B'],
    title: 'Comfortable shoes — Store B',
    description: branded('Store B'),
    price: 49.9,
    itemId: null,
    protected: false,
    sourceHash: sha,
    ...overrides,
  };
}

test('normalizes only recognized branding and preserves dashes within a store name', () => {
  const a = productIdentity('Shoes — Store — A', branded('Store — A'), ['Store — A']);
  const b = productIdentity('Shoes — Store B', branded('Store B'), ['Store B']);
  expect(a.titleKey).toBe('SHOES');
  expect(a.descriptionKey).toBe(b.descriptionKey);
  expect(productIdentity('Shoes — genuine leather', body).titleKey).toBe('SHOES — GENUINE LEATHER');
});

test('identical titles with different descriptions do not establish shared identity', () => {
  const record = legacy({ description: body + ' Different product construction.' });
  expect(recoverHistoricalProduct(record, buildRecoveryCatalog([source()], [record])).status).toBe(
    'unmatched',
  );
});

test('restores matching copy while preserving each customer price and generating fresh SKUs', () => {
  const record = legacy();
  const result = recoverHistoricalProduct(record, buildRecoveryCatalog([source()], [record]));
  expect(result.status).toBe('recovered');
  expect(result.method).toBe('title_description');
  expect(result.product?.title).toBe(record.title!);
  expect(result.product?.description).toBe(record.description!);
  expect(result.product?.priceCents).toBe(4990);
  expect(result.product?.variants.map((row) => row.options)).toEqual([
    { Size: '35' },
    { Size: '36' },
  ]);
  expect(new Set(result.product?.variants.map((row) => row.sku)).size).toBe(2);
  expect(result.product?.variants[0]?.sku).not.toBe('SHOE-35');
  expect(JSON.stringify(result.product)).not.toContain('model_id');
  expect(JSON.stringify(result.product)).not.toContain('observedPriceCents');
  expect(result.product?.publicationReady).toBe(false);
  expect(result.product?.publicationBlockers).toContain('current_supplier_offer_required');
});

test('rejects out-of-range coordinates and duplicate combinations', () => {
  const invalid = item();
  invalid.recovered_models!.model[0]!.tier_index = [2];
  expect(validateRecoveredItem(invalid, source()).issues).toContain('invalid_variant_coordinates');
  invalid.recovered_models!.model[0]!.tier_index = [1];
  expect(validateRecoveredItem(invalid, source()).issues).toContain(
    'duplicate_variant_combination',
  );
});

test('rejects duplicate supplier SKUs and repeated normalized option labels', () => {
  const invalid = item();
  invalid.recovered_models!.model[1]!.model_sku = 'SHOE-35';
  invalid.recovered_models!.tier_variation[0]!.option_list[1]!.option = ' 35 ';
  const result = validateRecoveredItem(invalid, source());
  expect(result.issues).toContain('duplicate_supplier_variant_sku');
  expect(result.issues).toContain('duplicate_or_empty_variant_option');
});

test('preserves sparse variant matrices without inventing missing combinations', () => {
  const sparse = item();
  sparse.recovered_models!.model.pop();
  const result = validateRecoveredItem(sparse, source());
  expect(result.issues).toEqual([]);
  expect(result.variants).toHaveLength(1);
  expect(result.warnings).toContain('partial_variant_matrix_preserved');
});

test('requires verified media from the exact source catalog', () => {
  const input = source();
  input.images.catalogSha256 = 'b'.repeat(64);
  expect(validateRecoveredItem(item(), input).issues).toContain('image_manifest_source_mismatch');
  input.images.catalogSha256 = sha;
  input.images.assets[0]!.checksumVerified = false;
  expect(validateRecoveredItem(item(), input).issues).toContain('gallery_image_not_archived');
});

test('does not choose between conflicting variation sets for the same copy', () => {
  const different = item({ item_id: 101 });
  different.recovered_models!.model.pop();
  const record = legacy();
  const result = recoverHistoricalProduct(
    record,
    buildRecoveryCatalog([source([item(), different])], [record]),
  );
  expect(result.status).toBe('review');
  expect(result.reasons).toContain('conflicting_product_or_variants');
});

test('uses shop-bound item references to retain earlier copy as a traceable shared alias', () => {
  const anchor = legacy({ shopId: '5', itemId: '100', title: 'Original shoe title — Store B' });
  const other = legacy({
    title: 'Original shoe title — Store C',
    storeNames: ['Store C'],
    description: branded('Store C'),
  });
  const catalog = buildRecoveryCatalog([source()], [anchor, other]);
  expect(recoverHistoricalProduct(anchor, catalog).method).toBe('shop_item_id');
  expect(recoverHistoricalProduct(other, catalog).status).toBe('recovered');
  expect(recoverHistoricalProduct(other, catalog).method).toBe('title_description');
  expect(
    recoverHistoricalProduct(
      { ...anchor, shopId: '6', title: 'Unrelated', description: null },
      catalog,
    ).status,
  ).toBe('unmatched');
});

test('preserves account protection and refuses missing or invalid historical prices', () => {
  const record = legacy();
  const catalog = buildRecoveryCatalog([source()], [record]);
  expect(recoverHistoricalProduct({ ...record, protected: true }, catalog).status).toBe(
    'protected',
  );
  expect(recoverHistoricalProduct({ ...record, userId: null }, catalog).status).toBe('protected');
  expect(recoverHistoricalProduct({ ...record, price: 0 }, catalog).status).toBe('review');
});

test('preserves variant identity when source tier ordering changes', () => {
  const a = item();
  a.recovered_models!.tier_variation.push({ name: 'Color', option_list: [{ option: 'Blue' }] });
  for (const model of a.recovered_models!.model) model.tier_index.push(0);
  const b = structuredClone(a);
  b.recovered_models!.tier_variation.reverse();
  for (const model of b.recovered_models!.model) model.tier_index.reverse();
  expect(validateRecoveredItem(a, source()).variantFingerprint).toBe(
    validateRecoveredItem(b, source()).variantFingerprint,
  );
  expect(recoveryHash('source')).toHaveLength(64);
});

test('source fingerprints remain stable across JSONB object key ordering', () => {
  expect(legacyRecordHash({ title: 'Original', nested: { z: 1, a: 2 } })).toBe(
    legacyRecordHash({ nested: { a: 2, z: 1 }, title: 'Original' }),
  );
  expect(legacyRecordHash({ title: 'Edited' })).not.toBe(legacyRecordHash({ title: 'Original' }));
});

test('recognizes verified legacy wrapper variations without removing product details', () => {
  const variants = [
    `Direto da Store A pra você:\n\nStore A\n\n${body}\n\nTem dúvida? A Store A está aqui pra te ajudar.`,
    `Store B — produtos selecionados a dedo.\n\nStore B\n\n${body}\n\nCompre na Store B e sinta a diferença de quem se importa.`,
    `Esta é a Store C, e este é um dos nossos destaques.\n\nStore C\n\n${body}\n\nStore C agradece sua visita. Volte sempre!`,
  ];
  const identities = variants.map((description, index) =>
    productIdentity(`Shoes — Store ${'ABC'[index]}`, description),
  );
  expect(new Set(identities.map((row) => row.descriptionKey)).size).toBe(1);
  expect(identities.map((row) => row.titleKey)).toEqual(['SHOES', 'SHOES', 'SHOES']);
  expect(identities[0]!.description).toBe(body);
  const extra = variants[0]!.replace(body, body + ' Manufactured for Store A.');
  expect(productIdentity('Shoes — Store A', extra).description).toContain(
    'Manufactured for Store A.',
  );
});

test('keeps an unknown commercial or product ending instead of guessing what to remove', () => {
  const text = branded('Store A').replace(
    'Store A — sempre disponível pra você.',
    'Store A special edition uses a different sole.',
  );
  expect(productIdentity('Shoes — Store A', text).description).toContain('different sole');
});
