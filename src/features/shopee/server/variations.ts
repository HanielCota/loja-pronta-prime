import { z } from 'zod';
import type { PublicationPayload } from '@/features/assistant/model';
import type { ShopeeConfiguration } from '../authorization';
import { readShopeeResource, writeShopeeResource } from './resources';

export async function readProductModels(
  config: ShopeeConfiguration,
  access: { shopId: number; accessToken: string },
  itemId: number,
  fetcher: typeof fetch = fetch,
) {
  return readShopeeResource(
    config,
    access,
    '/api/v2/product/get_model_list',
    z.object({
      tier_variation: z
        .array(
          z.object({ name: z.string(), option_list: z.array(z.object({ option: z.string() })) }),
        )
        .default([]),
      // Anúncio sem variações: a Shopee pode omitir `model` (como já omite `tier_variation`).
      model: z
        .array(
          z.object({
            model_sku: z.string(),
            tier_index: z.array(z.number().int().nonnegative()),
            price_info: z.array(z.object({ original_price: z.number() })).optional(),
            stock_info_v2: z
              .object({
                summary_info: z.object({ total_available_stock: z.number().int().nonnegative() }),
              })
              .optional(),
          }),
        )
        .default([]),
    }),
    { item_id: String(itemId) },
    fetcher,
  );
}
export function modelsMatchPublication(
  actual: Awaited<ReturnType<typeof readProductModels>>,
  expected: NonNullable<PublicationPayload['variations']>,
) {
  return (
    JSON.stringify(actual.tier_variation) === JSON.stringify(expected.tier_variation) &&
    actual.model.length === expected.model.length &&
    expected.model.every((model) =>
      actual.model.some(
        (row) =>
          row.model_sku === model.model_sku &&
          row.stock_info_v2?.summary_info.total_available_stock === model.normal_stock &&
          JSON.stringify(row.tier_index) === JSON.stringify(model.tier_index) &&
          row.price_info?.some(
            (price) =>
              Math.round(price.original_price * 100) === Math.round(model.original_price * 100),
          ),
      ),
    )
  );
}
export async function publishProductVariations(
  config: ShopeeConfiguration,
  access: { shopId: number; accessToken: string },
  itemId: number,
  expected: NonNullable<PublicationPayload['variations']>,
  fetcher: typeof fetch = fetch,
) {
  const existing = await readProductModels(config, access, itemId, fetcher);
  if (!modelsMatchPublication(existing, expected)) {
    if (existing.tier_variation.length)
      throw new Error('As variações existentes precisam de conferência.');
    await writeShopeeResource(
      config,
      access,
      '/api/v2/product/init_tier_variation',
      { item_id: itemId, ...expected },
      z.object({}),
      fetcher,
    );
    const confirmed = await readProductModels(config, access, itemId, fetcher);
    if (!modelsMatchPublication(confirmed, expected))
      throw new Error('As variações ainda não foram confirmadas.');
  }
  await writeShopeeResource(
    config,
    access,
    '/api/v2/product/update_item',
    { item_id: itemId, item_status: 'NORMAL' },
    z.object({}),
    fetcher,
  );
}
