import { z } from 'zod';
import type { ShopeeConfiguration } from '@/features/shopee/authorization';
import { readShopeeResource } from '@/features/shopee/server/resources';
import { readProductModels } from '@/features/shopee/server/variations';
import { publicationPayloadSchema } from '../model';
import { publicationOfferFingerprint } from '../publication-selection';
import { assertAssistantAccess } from './metrics';
import { readShopeeAccess } from '@/features/shopee/server/connection';

export async function readCloneOffer(
  config: ShopeeConfiguration,
  access: { shopId: number; accessToken: string },
  userId: string,
  itemId: number,
  fetcher: typeof fetch = fetch,
) {
  const result = await readShopeeResource(
    config,
    access,
    '/api/v2/product/get_item_base_info',
    z.object({ item_list: z.array(z.looseObject({ item_id: z.number() })) }),
    { item_id_list: String(itemId) },
    fetcher,
  );
  const source = result.item_list.find((row) => row.item_id === itemId);
  if (!source) throw new Error('Anúncio indisponível.');
  const prices = z
    .array(z.object({ original_price: z.number(), currency: z.string().optional() }))
    .min(1)
    .parse(source.price_info);
  const price =
    prices.find((row) => row.currency === 'BRL') ?? (prices.length === 1 ? prices[0] : undefined);
  const stock = z
    .object({ summary_info: z.object({ total_available_stock: z.number().int().nonnegative() }) })
    .parse(source.stock_info_v2);
  const models = await readProductModels(config, access, itemId, fetcher);
  const variations = models.tier_variation.length
    ? {
        tier_variation: models.tier_variation,
        model: models.model.map((model) => ({
          model_sku: model.model_sku,
          tier_index: model.tier_index,
          original_price: z.number().positive().parse(model.price_info?.[0]?.original_price),
          normal_stock: z
            .number()
            .int()
            .nonnegative()
            .parse(model.stock_info_v2?.summary_info.total_available_stock),
        })),
      }
    : undefined;
  const payload = publicationPayloadSchema.parse({
    ...source,
    item_sku:
      typeof source.item_sku === 'string' && source.item_sku ? source.item_sku : `item-${itemId}`,
    original_price: price?.original_price,
    normal_stock: stock.summary_info.total_available_stock,
    condition: 'NEW',
    item_status: 'NORMAL',
    logistic_info: z
      .array(z.looseObject({ enabled: z.boolean() }))
      .parse(source.logistic_info)
      .filter((row) => row.enabled),
    variations,
  });
  // Produtos usados ou em estado diferente precisam de outro contrato; não converte silenciosamente.
  if (source.condition !== 'NEW' || source.item_status !== 'NORMAL')
    throw new Error('Anúncio não elegível.');
  const fingerprint = publicationOfferFingerprint(payload, {
    userId,
    shopId: access.shopId,
    applicationId: `${config.SHOPEE_ENVIRONMENT}:${config.SHOPEE_PARTNER_ID}`,
  });
  return { itemId, payload, fingerprint };
}

export function newCloneTemplate(
  offer: Awaited<ReturnType<typeof readCloneOffer>>,
  changes: Record<string, unknown>,
  intentId: string,
) {
  const sku = `lpp-${z.uuid().parse(intentId)}-${offer.itemId}`;
  return publicationPayloadSchema.parse({
    ...offer.payload,
    ...changes,
    item_sku: sku,
    variations: offer.payload.variations
      ? {
          tier_variation: offer.payload.variations.tier_variation,
          model: offer.payload.variations.model.map((model, index) => ({
            ...model,
            model_sku: `${sku}-${index}`,
          })),
        }
      : undefined,
  });
}

export async function userCloneOffers(userId: string, itemIds: number[]) {
  if (process.env.SHOPEE_DUPLICATION_ENABLED !== 'true') return [];
  const config = await assertAssistantAccess(userId, 'sll');
  const access = await readShopeeAccess(userId, config);
  const output: Awaited<ReturnType<typeof readCloneOffer>>[] = [];
  for (let start = 0; start < Math.min(itemIds.length, 20); start += 4) {
    const results = await Promise.allSettled(
      itemIds
        .slice(start, start + 4)
        .map((itemId) => readCloneOffer(config, access, userId, itemId)),
    );
    for (const result of results) if (result.status === 'fulfilled') output.push(result.value);
  }
  return output;
}
