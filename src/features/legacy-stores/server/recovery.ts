import type { PoolClient } from 'pg';
import { z } from 'zod';
import type { LegacyProduct, LegacyStore } from '../model';
import {
  legacyRecordHash,
  productIdentity,
  recoverHistoricalProduct,
  type BaseProduct,
  type ProductRecovery,
  type RecoveryCatalog,
} from '../recovery';

/** Callers authenticate the viewer; every row is additionally bound to its current owner. */
export async function readRecoveredLegacyCatalog(
  client: Pick<PoolClient, 'query'>,
  userId: string,
  storeId: string,
  options: {
    runId?: string;
    productIds?: string[];
    recoveredOnly?: boolean;
    limit?: number;
    offset?: number;
    lock?: boolean;
  } = {},
) {
  if (!userId || !z.guid().safeParse(storeId).success) return [];
  if (options.runId && !/^[a-f0-9]{64}$/.test(options.runId)) return [];
  if (
    options.productIds &&
    (!options.productIds.length ||
      options.productIds.length > 50 ||
      options.productIds.some((id) => !z.guid().safeParse(id).success))
  )
    return [];
  const limit = Math.min(250, Math.max(1, options.limit ?? 250));
  const offset = Math.max(0, options.offset ?? 0);
  const { rows } = await client.query<{
    id: string;
    store_id: string;
    record: LegacyProduct;
    store_record: LegacyStore;
    source_hash: string;
    status: ProductRecovery['status'];
    method: ProductRecovery['method'];
    reasons: string[];
    base_id: string | null;
    base: BaseProduct | null;
  }>(
    `WITH target AS (
      SELECT s.id,s.customer_id,s.record FROM legacy_stores s
      JOIN legacy_customers c ON c.id=s.customer_id WHERE s.id=$2::uuid AND c.user_id=$1
    ), product_store AS (
      SELECT coalesce(linked.id,t.id) id FROM target t LEFT JOIN legacy_stores linked
        ON linked.id::text=t.record->>'loja_shopee_vinculada_id' AND linked.customer_id=t.customer_id
    ), latest AS (
      SELECT id FROM legacy_catalog_recovery_runs WHERE applied_at IS NOT NULL AND ($3::text IS NULL OR id=$3)
      ORDER BY applied_at DESC,id DESC LIMIT 1
    )
    SELECT p.id,p.store_id,p.record,s.record store_record,r.source_hash,r.status,r.method,r.reasons,
      b.id base_id,b.product base FROM product_store scope
    JOIN legacy_store_products p ON p.store_id=scope.id JOIN legacy_stores s ON s.id=p.store_id
    JOIN legacy_customers c ON c.id=s.customer_id AND c.user_id=$1
    JOIN legacy_product_recoveries r ON r.product_id=p.id AND r.store_id=p.store_id AND r.user_id=$1
    JOIN latest ON latest.id=r.run_id LEFT JOIN legacy_catalog_products b ON b.run_id=r.run_id AND b.id=r.base_product_id
    WHERE ($4::uuid[] IS NULL OR p.id=ANY($4::uuid[])) AND (NOT $5::boolean OR r.status='recovered')
    ORDER BY p.id LIMIT $6 OFFSET $7 ${options.lock ? 'FOR SHARE OF p,s,c' : ''}`,
    [
      userId,
      storeId,
      options.runId ?? null,
      options.productIds ?? null,
      options.recoveredOnly ?? false,
      limit,
      offset,
    ],
  );
  return rows.map((row) => {
    const metadata = {
      id: row.id,
      sourceHash: row.source_hash,
      status: row.status,
      method: row.method,
      reasons: row.reasons,
    };
    if (row.status !== 'recovered' || !row.base || !row.base_id)
      return { ...metadata, product: null };
    if (legacyRecordHash(row.record) !== row.source_hash || row.base.id !== row.base_id)
      return {
        ...metadata,
        status: 'review' as const,
        reasons: ['source_changed_after_recovery'],
        product: null,
      };
    const names = [row.store_record.nome, row.store_record.shopee_nome].filter(
      (name): name is string => Boolean(name),
    );
    const identity = productIdentity(row.record.titulo, row.record.descricao, names);
    const catalog: RecoveryCatalog = {
      products: new Map([[row.base.id, row.base]]),
      aliases: new Map(),
      direct: new Map(),
    };
    if (identity.titleKey && identity.descriptionKey)
      catalog.aliases.set(
        `${identity.titleKey}:${identity.descriptionKey}`,
        new Set([row.base.id]),
      );
    for (const source of row.base.sources)
      if (
        String(source.shopId) === row.store_record.shopee_shop_id &&
        String(source.itemId) === row.record.shopee_item_id
      )
        catalog.direct.set(`${source.shopId}:${source.itemId}`, new Set([row.base.id]));
    const recovered = recoverHistoricalProduct(
      {
        id: row.id,
        storeId: row.store_id,
        userId,
        shopId: row.store_record.shopee_shop_id,
        storeNames: names,
        title: row.record.titulo,
        description: row.record.descricao,
        price: row.record.preco_final,
        itemId: row.record.shopee_item_id,
        protected: false,
        sourceHash: row.source_hash,
      },
      catalog,
    );
    return {
      ...metadata,
      status: recovered.status,
      reasons: recovered.reasons,
      product: recovered.product,
    };
  });
}
