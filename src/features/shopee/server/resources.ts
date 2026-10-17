import { z } from 'zod';
import { signShopeeRequest } from '@/lib/shopee-protocol';
import { shopeeApiOrigin, type ShopeeConfiguration } from '../authorization';
import { ShopeeApiError } from './client';

const READ_PATHS = [
  '/api/v2/shop/get_shop_info',
  '/api/v2/product/get_item_list',
  '/api/v2/product/get_item_base_info',
  '/api/v2/product/get_item_extra_info',
  '/api/v2/product/get_category',
] as const;
export type ShopeeReadPath = (typeof READ_PATHS)[number];

/** Origem fixa, assinatura por loja e erros sem o URL que contém os tokens. */
async function request<T>(
  config: ShopeeConfiguration,
  shop: { shopId: number; accessToken: string },
  path: string,
  schema: z.ZodType<T>,
  query: Record<string, string>,
  body: unknown | undefined,
  fetcher: typeof fetch,
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const url = new URL(path, shopeeApiOrigin(config));
  url.search = new URLSearchParams({
    ...query,
    partner_id: String(config.SHOPEE_PARTNER_ID),
    timestamp: String(timestamp),
    access_token: shop.accessToken,
    shop_id: String(shop.shopId),
    sign: signShopeeRequest(
      config.SHOPEE_PARTNER_ID,
      path,
      timestamp,
      config.SHOPEE_PARTNER_KEY,
      shop,
    ),
  }).toString();
  let response: Response;
  try {
    response = await fetcher(url, {
      method: body === undefined ? 'GET' : 'POST',
      ...(body === undefined
        ? {}
        : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ShopeeApiError('unavailable');
  }
  if (!response.ok)
    throw new ShopeeApiError(
      response.status >= 500 || response.status === 429 ? 'unavailable' : 'rejected',
    );
  let decoded: unknown;
  try {
    const text = await response.text();
    if (text.length > 2_000_000) throw new Error('Resposta grande demais.');
    decoded = JSON.parse(text);
  } catch {
    throw new ShopeeApiError('response');
  }
  const envelope = z
    .object({ error: z.string(), response: z.unknown().optional() })
    .safeParse(decoded);
  if (!envelope.success) throw new ShopeeApiError('response');
  if (envelope.data.error) throw new ShopeeApiError('rejected');
  const parsed = schema.safeParse(envelope.data.response ?? decoded);
  if (!parsed.success) throw new ShopeeApiError('response');
  return parsed.data;
}

export async function readShopeeResource<T>(
  config: ShopeeConfiguration,
  shop: { shopId: number; accessToken: string },
  path: ShopeeReadPath,
  schema: z.ZodType<T>,
  query: Record<string, string> = {},
  fetcher: typeof fetch = fetch,
) {
  if (!READ_PATHS.includes(path)) throw new ShopeeApiError('rejected');
  return request(config, shop, path, schema, query, undefined, fetcher);
}

/** Uma escrita é enviada uma única vez; resultado incerto exige conciliação pelo SKU. */
export async function addShopeeItem(
  config: ShopeeConfiguration,
  shop: { shopId: number; accessToken: string },
  body: unknown,
  fetcher: typeof fetch = fetch,
) {
  return request(
    config,
    shop,
    '/api/v2/product/add_item',
    z.object({ item_id: z.number().int().positive().safe() }),
    {},
    body,
    fetcher,
  );
}
