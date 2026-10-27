import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { z } from 'zod';
import { findSku } from '@/features/assistant/server/operations';
import { prepareSupplierProduct } from '@/features/shopee/catalog';
import { shopeeApplicationId, type ShopeeConfiguration } from '@/features/shopee/authorization';
import { setTimeout as delay } from 'node:timers/promises';
import { prepareRecoveredShopeeProduct } from './publication-preparation';
import {
  addShopeeItem,
  readShopeeResource,
  writeShopeeResource,
} from '@/features/shopee/server/resources';
import { readProductModels, modelsMatchPublication } from '@/features/shopee/server/variations';
import { importedProduct } from './catalog-data';
import { recoveredImageKey, recoveredProductImages } from '../catalog-import';
import { legacyRecordHash } from '../recovery';
import { recoveredPublicationFingerprint, recoveredListingPayload } from '../publication';
import type { RecoveredPublication } from './publication-data';

type Dependencies = {
  enabled(): boolean;
  assertAccess(userId: string): Promise<ShopeeConfiguration>;
  readAccess(
    userId: string,
    config: ShopeeConfiguration,
  ): Promise<{ shopId: number; accessToken: string }>;
  readImage(key: string): Promise<Uint8Array | null>;
  fetcher?: typeof fetch;
  waitForItem?: () => Promise<void>;
};

/** A claimed confirmation authorizes one listing attempt. Unknown writes are never retried. */
export async function executeRecoveredPublication(
  pool: Pool,
  row: RecoveredPublication,
  deps: Dependencies,
) {
  let writing = false;
  try {
    const {
      rows: [scope],
    } = await pool.query<{
      product_id: string;
      historical_shop: string | null;
      historical_item: string | null;
    }>(
      `SELECT i.product_id,s.record->>'shopee_shop_id' historical_shop,p.record->>'shopee_item_id' historical_item FROM legacy_catalog_imports i JOIN legacy_stores s ON s.id=i.store_id JOIN legacy_store_products p ON p.id=i.product_id WHERE i.id=$1 AND i.user_id=$2`,
      [row.import_id, row.user_id],
    );
    if (!scope || !row.intent || !row.expires_at || !row.confirmed_at) throw new Error('scope');
    const intent = row.intent;
    const expectedFingerprint = recoveredPublicationFingerprint({
      importId: row.import_id,
      applicationId: row.application_id,
      shopId: row.shop_id,
      context: row.context,
      intent,
      expiresAt: row.expires_at,
    });
    if (row.fingerprint !== expectedFingerprint) throw new Error('fingerprint');
    const config = await deps.assertAccess(row.user_id);
    const access = await deps.readAccess(row.user_id, config);
    const guard = async () => {
      const currentConfig = await deps.assertAccess(row.user_id);
      if (
        !deps.enabled() ||
        currentConfig.SHOPEE_ENVIRONMENT !== 'live' ||
        shopeeApplicationId(currentConfig) !== row.application_id ||
        access.shopId !== row.shop_id ||
        row.expires_at! <= new Date() ||
        prepareSupplierProduct(intent.offer, new Date()).status !== 'prepared'
      )
        throw new Error('expired');
      const imported = await importedProduct(pool, row.user_id, scope.product_id);
      if (
        !imported ||
        imported.id !== row.import_id ||
        imported.revision !== intent.revision ||
        imported.source_hash !== intent.sourceHash ||
        legacyRecordHash(imported.product) !== intent.productHash
      )
        throw new Error('changed');
      const renewed = await pool.query(
        `UPDATE legacy_catalog_publications p SET lease_until=now()+interval '10 minutes',updated_at=now()
        WHERE p.id=$1 AND p.lease_id=$2 AND p.lease_until>now() AND p.status in ('preparing','sending') AND p.fingerprint=$3
        AND EXISTS (SELECT 1 FROM shopee_connections c WHERE c.user_id=p.user_id AND c.shop_id=p.shop_id AND c.application_id=p.application_id AND c.revoked_at IS NULL) RETURNING p.id`,
        [row.id, row.lease_id, row.fingerprint],
      );
      if (renewed.rowCount !== 1) throw new Error('lease');
      return imported.product;
    };
    const fetcher = (async (url, init) => {
      await guard();
      if (new URL(String(url)).pathname === '/api/v2/product/add_item') writing = true;
      return (deps.fetcher ?? fetch)(url, init);
    }) as typeof fetch;
    const product = await guard();
    if (
      scope.historical_shop === String(access.shopId) &&
      scope.historical_item &&
      /^[1-9]\d{0,15}$/.test(scope.historical_item)
    ) {
      const oldId = Number(scope.historical_item);
      if (!Number.isSafeInteger(oldId)) throw new Error('scope');
      const old = await readShopeeResource(
        config,
        access,
        '/api/v2/product/get_item_base_info',
        z.object({
          item_list: z.array(z.object({ item_id: z.number(), item_status: z.string() })),
        }),
        { item_id_list: String(oldId) },
        fetcher,
      );
      if (old.item_list.some((item) => item.item_id === oldId && item.item_status !== 'DELETED'))
        throw new Error('duplicate');
    }
    if ((await findSku(config, access, intent.offer.sku, fetcher)).length)
      throw new Error('duplicate');
    const payload = await prepareRecoveredShopeeProduct(
      config,
      access,
      intent,
      fetcher,
      async (url, _hosts, limit) => {
        await guard();
        const asset = recoveredProductImages(product)
          .slice(0, 9)
          .find((candidate) => url === `https://recovered.invalid/images/${candidate.sha256}`);
        const key = asset && recoveredImageKey(asset);
        if (!asset || !key || asset.bytes > limit) throw new Error('image');
        const bytes = await deps.readImage(key);
        if (
          !bytes ||
          bytes.byteLength !== asset.bytes ||
          createHash('sha256').update(bytes).digest('hex') !== asset.sha256
        )
          throw new Error('image');
        return { bytes: Buffer.from(bytes), contentType: asset.contentType };
      },
    );
    await guard();
    const listing = recoveredListingPayload(payload, intent);
    const saved = await pool.query(
      "UPDATE legacy_catalog_publications SET payload=$3,status='sending',updated_at=now() WHERE id=$1 AND lease_id=$2 AND status='preparing' AND lease_until>now() RETURNING id",
      [row.id, row.lease_id, JSON.stringify(listing)],
    );
    if (saved.rowCount !== 1) throw new Error('lease');
    const { variations } = payload;
    // Keep every new listing hidden until the complete product has been read back.
    const result = await addShopeeItem(config, access, listing.base, fetcher);
    const stored = await pool.query(
      "UPDATE legacy_catalog_publications SET item_id=$3,updated_at=now() WHERE id=$1 AND lease_id=$2 AND status='sending' AND lease_until>now() RETURNING id",
      [row.id, row.lease_id, result.item_id],
    );
    if (stored.rowCount !== 1) throw new Error('lease');
    if (variations) {
      await (deps.waitForItem ?? (() => delay(5000)))();
      await guard();
      await writeShopeeResource(
        config,
        access,
        '/api/v2/product/init_tier_variation',
        { item_id: result.item_id, ...listing.variations },
        z.object({}),
        fetcher,
      );
      const actual = await readProductModels(config, access, result.item_id, fetcher);
      if (
        !modelsMatchPublication(actual, variations) ||
        !variations.model.every((model) =>
          actual.model.some(
            (remoteModel) =>
              remoteModel.model_sku === model.model_sku &&
              remoteModel.stock_info_v2?.summary_info.total_available_stock === model.normal_stock,
          ),
        )
      )
        throw new Error('models');
    }
    const verify = async (status: string) => {
      const actual = await readShopeeResource(
        config,
        access,
        '/api/v2/product/get_item_base_info',
        z.object({
          item_list: z.array(
            z.object({
              item_id: z.number(),
              item_sku: z.string(),
              item_name: z.string(),
              category_id: z.number(),
              item_status: z.string(),
              has_model: z.boolean(),
              price_info: z.array(z.object({ original_price: z.number() })).optional(),
              stock_info_v2: z
                .object({ summary_info: z.object({ total_available_stock: z.number() }) })
                .optional(),
            }),
          ),
        }),
        { item_id_list: String(result.item_id) },
        fetcher,
      );
      const item = actual.item_list.find((candidate) => candidate.item_id === result.item_id);
      if (
        !item ||
        item.item_sku !== payload.item_sku ||
        item.item_name !== payload.item_name ||
        item.category_id !== payload.category_id ||
        item.item_status !== status ||
        item.has_model !== Boolean(variations)
      )
        throw new Error('verification');
      if (
        !variations &&
        (!item.price_info?.some(
          (price) =>
            Math.round(price.original_price * 100) === Math.round(payload.original_price * 100),
        ) ||
          item.stock_info_v2?.summary_info.total_available_stock !== payload.normal_stock)
      )
        throw new Error('offer');
    };
    await verify('UNLIST');
    await writeShopeeResource(
      config,
      access,
      '/api/v2/product/update_item',
      { item_id: result.item_id, item_status: 'NORMAL' },
      z.object({}),
      fetcher,
    );
    await verify('NORMAL');
    const finished = await pool.query(
      "UPDATE legacy_catalog_publications SET status='published',failure=null,lease_id=null,lease_until=null,updated_at=now() WHERE id=$1 AND lease_id=$2 AND status='sending' AND lease_until>now() RETURNING id",
      [row.id, row.lease_id],
    );
    if (finished.rowCount !== 1) throw new Error('lease');
    return 'published';
  } catch (error) {
    const reason =
      error instanceof Error && ['duplicate', 'image', 'changed', 'expired'].includes(error.message)
        ? error.message
        : 'preflight';
    const status = writing ? 'unknown' : 'blocked';
    await pool.query(
      "UPDATE legacy_catalog_publications SET status=$3,failure=$4,lease_id=null,lease_until=null,updated_at=now() WHERE id=$1 AND lease_id=$2 AND status in ('preparing','sending')",
      [row.id, row.lease_id, status, writing ? 'unconfirmed-write' : reason],
    );
    return status;
  }
}
