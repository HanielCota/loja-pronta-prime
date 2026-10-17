import { expect, test } from 'bun:test';
import { buildProductVariations, matchesSupplierOffer } from './supplier-offer';
import { publicationOfferFingerprint } from './publication-selection';
import { publicationPayloadSchema } from './model';
import { supplierProductSchema } from '@/features/shopee/catalog';

const product = () =>
  supplierProductSchema.parse({
    supplierId: 'real-contract',
    sku: 'shirt',
    title: 'Camiseta',
    description: 'Algodão',
    images: ['https://images.example.com/shirt.png'],
    costCents: 1000,
    priceCents: 2000,
    stock: 4,
    weightGrams: 200,
    dimensionsCm: { length: 10, width: 10, height: 10 },
    updatedAt: new Date().toISOString(),
    variants: [
      { sku: 'shirt-p', options: { Tamanho: 'P' }, costCents: 1000, priceCents: 2000, stock: 2 },
      { sku: 'shirt-m', options: { Tamanho: 'M' }, costCents: 1100, priceCents: 2200, stock: 2 },
    ],
  });
const payload = () =>
  publicationPayloadSchema.parse({
    item_sku: 'shirt',
    item_name: 'Camiseta',
    description: 'Algodão',
    category_id: 1,
    original_price: 20,
    normal_stock: 4,
    weight: 0.2,
    condition: 'NEW',
    item_status: 'NORMAL',
    image: { image_id_list: ['image'] },
    dimension: { package_length: 10, package_width: 10, package_height: 10 },
    logistic_info: [{ logistic_id: 1, enabled: true, is_free: false }],
    brand: { brand_id: 0, original_brand_name: '' },
    variations: buildProductVariations(product()),
  });

test('preserva todos os preços, estoques e combinações do fornecedor', () => {
  expect(buildProductVariations(product())).toEqual({
    tier_variation: [{ name: 'Tamanho', option_list: [{ option: 'P' }, { option: 'M' }] }],
    model: [
      { tier_index: [0], model_sku: 'shirt-p', original_price: 20, normal_stock: 2 },
      { tier_index: [1], model_sku: 'shirt-m', original_price: 22, normal_stock: 2 },
    ],
  });
  expect(matchesSupplierOffer(payload(), product())).toBe(true);
  const changed = product();
  changed.variants[1]!.priceCents++;
  expect(matchesSupplierOffer(payload(), changed)).toBe(false);
});
test('não inventa SKUs para combinações ausentes nem aceita combinações repetidas', () => {
  const value = product();
  value.variants[0]!.options = { Cor: 'Azul', Tamanho: 'P' };
  value.variants[1]!.options = { Cor: 'Verde', Tamanho: 'M' };
  expect(() => buildProductVariations(value)).toThrow('todas as combinações');
  value.variants[1]!.options = { Cor: 'Azul', Tamanho: 'P' };
  expect(() => buildProductVariations(value)).toThrow('repetida');
});
test('a autorização deixa de valer quando uma variação muda', () => {
  const value = payload();
  const owner = { userId: 'one', shopId: 1, applicationId: 'live:1' };
  const original = publicationOfferFingerprint(value, owner);
  value.variations!.model[0]!.original_price++;
  expect(publicationOfferFingerprint(value, owner)).not.toBe(original);
});
