import { describe, expect, test } from 'bun:test';
import { publicationPayloadSchema } from './model';

const base = {
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
};
const tierVariation = [
  { name: 'Cor', option_list: [{ option: 'Azul' }, { option: 'Rosa' }] },
  { name: 'Tamanho', option_list: [{ option: 'P' }] },
];
const model = (tier_index: number[]) => ({
  tier_index,
  model_sku: 'sku-0',
  original_price: 20,
  normal_stock: 1,
});
const parse = (models: ReturnType<typeof model>[]) =>
  publicationPayloadSchema.safeParse({
    ...base,
    variations: { tier_variation: tierVariation, model: models },
  });

describe('publication variations', () => {
  test('accepts variations that point at existing options', () => {
    expect(parse([model([0, 0]), model([1, 0])]).success).toBe(true);
    expect(publicationPayloadSchema.safeParse(base).success).toBe(true);
  });

  test('rejects option indexes outside the list instead of showing undefined later', () => {
    expect(parse([model([2, 0])]).success).toBe(false);
    expect(parse([model([0, 1])]).success).toBe(false);
  });

  test('rejects variations with fewer or more indexes than tiers', () => {
    expect(parse([model([0])]).success).toBe(false);
    expect(
      publicationPayloadSchema.safeParse({
        ...base,
        variations: { tier_variation: tierVariation.slice(0, 1), model: [model([0, 0])] },
      }).success,
    ).toBe(false);
  });
});
