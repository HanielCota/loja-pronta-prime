import { z } from 'zod';
import { signShopeeRequest } from '@/lib/shopee-protocol';
import { shopeeApiOrigin, type ShopeeConfiguration } from '../authorization';
import { readShopeeJson, ShopeeApiError } from './client';

const READ_PATHS = [
  '/api/v2/shop/get_shop_info',
  '/api/v2/product/get_item_list',
  '/api/v2/product/get_item_base_info',
  '/api/v2/product/get_item_extra_info',
  '/api/v2/product/get_category',
  '/api/v2/product/get_attributes',
  '/api/v2/product/get_attribute_tree',
  '/api/v2/product/get_item_limit',
  '/api/v2/product/get_brand_list',
  '/api/v2/product/get_model_list',
  '/api/v2/logistics/get_channel_list',
  '/api/v2/shop/get_profile',
] as const;
export type ShopeeReadPath = (typeof READ_PATHS)[number];

/** Origem fixa, assinatura por loja e erros sem o URL que contém os tokens. */
export async function requestShopeeResource<T>(
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
  // Uma página de 100 anúncios fica bem abaixo de 2 MB.
  const decoded = await readShopeeJson(response, 2_000_000);
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
  return requestShopeeResource(config, shop, path, schema, query, undefined, fetcher);
}

/** Uma escrita é enviada uma única vez; resultado incerto exige conciliação pelo SKU. */
export async function addShopeeItem(
  config: ShopeeConfiguration,
  shop: { shopId: number; accessToken: string },
  body: unknown,
  fetcher: typeof fetch = fetch,
) {
  return requestShopeeResource(
    config,
    shop,
    '/api/v2/product/add_item',
    z.object({ item_id: z.number().int().positive().safe() }),
    {},
    body,
    fetcher,
  );
}

const WRITE_PATHS = [
  '/api/v2/product/init_tier_variation',
  '/api/v2/product/update_item',
  '/api/v2/shop/update_profile',
] as const;
export async function writeShopeeResource<T>(
  config: ShopeeConfiguration,
  shop: { shopId: number; accessToken: string },
  path: (typeof WRITE_PATHS)[number],
  body: unknown,
  schema: z.ZodType<T>,
  fetcher: typeof fetch = fetch,
) {
  if (!WRITE_PATHS.includes(path)) throw new ShopeeApiError('rejected');
  return requestShopeeResource(config, shop, path, schema, {}, body, fetcher);
}

export async function uploadShopeeMedia(
  config: ShopeeConfiguration,
  _shop: { shopId: number; accessToken: string },
  bytes: Uint8Array,
  fetcher: typeof fetch = fetch,
) {
  if (!bytes.length || bytes.length > 2_000_000) throw new ShopeeApiError('rejected');
  const path = '/api/v2/media_space/upload_image';
  const timestamp = Math.floor(Date.now() / 1000);
  const url = new URL(path, shopeeApiOrigin(config));
  url.search = new URLSearchParams({
    partner_id: String(config.SHOPEE_PARTNER_ID),
    timestamp: String(timestamp),
    sign: signShopeeRequest(config.SHOPEE_PARTNER_ID, path, timestamp, config.SHOPEE_PARTNER_KEY),
  }).toString();
  const form = new FormData();
  form.set('image', new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }), 'product.jpg');
  let response;
  try {
    response = await fetcher(url, {
      method: 'POST',
      body: form,
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    });
  } catch {
    throw new ShopeeApiError('unavailable');
  }
  if (!response.ok)
    throw new ShopeeApiError(
      response.status >= 500 || response.status === 429 ? 'unavailable' : 'rejected',
    );
  const decoded = z
    .object({
      error: z.string(),
      response: z
        .object({
          image_info: z.object({
            image_id: z.string().min(1).max(200),
            image_url_list: z.array(z.object({ image_url: z.url() })).optional(),
          }),
        })
        .optional(),
    })
    .safeParse(await readShopeeJson(response, 64_000));
  if (!decoded.success || decoded.data.error || !decoded.data.response)
    throw new ShopeeApiError('response');
  const info = decoded.data.response.image_info;
  return {
    id: info.image_id,
    url: info.image_url_list?.find((row) => new URL(row.image_url).protocol === 'https:')
      ?.image_url,
  };
}

export async function uploadShopeeImage(
  config: ShopeeConfiguration,
  shop: { shopId: number; accessToken: string },
  bytes: Uint8Array,
  fetcher: typeof fetch = fetch,
) {
  return (await uploadShopeeMedia(config, shop, bytes, fetcher)).id;
}
