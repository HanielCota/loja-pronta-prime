import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { LEGACY_CATALOG_RUN } from '@/config/legacy-catalog';
import { legacyRecordHash, type RestoredProduct } from '../recovery';
import { recoveredSelectionSchema, catalogReviewSchema } from '../catalog-import';
import { readRecoveredLegacyCatalog } from './recovery';

type Client = Pick<PoolClient, 'query'>;
export async function recoveredStores(client: Client, userId: string) {
  const { rows } = await client.query<{
    id: string;
    name: string;
    available: number;
    imported: number;
  }>(
    `SELECT s.id,coalesce(nullif(s.record->>'nome',''),nullif(s.record->>'shopee_nome',''),'Loja anterior') name,
      count(*)::int available,count(i.id)::int imported
    FROM legacy_stores s JOIN legacy_customers c ON c.id=s.customer_id AND c.user_id=$1
    JOIN legacy_store_products p ON p.store_id=s.id
    JOIN legacy_product_recoveries r ON r.product_id=p.id AND r.store_id=s.id AND r.user_id=$1 AND r.run_id=$2 AND r.status='recovered'
    JOIN legacy_catalog_recovery_runs run ON run.id=r.run_id AND run.applied_at IS NOT NULL
    LEFT JOIN legacy_catalog_imports i ON i.user_id=$1 AND i.product_id=p.id AND i.run_id=r.run_id
    GROUP BY s.id ORDER BY s.id`,
    [userId, LEGACY_CATALOG_RUN],
  );
  return rows;
}

export async function importedProducts(client: Client, userId: string, page = 1) {
  const { rows } = await client.query<{
    product_id: string;
    store_id: string;
    source_hash: string;
    original: unknown;
    product: RestoredProduct;
    revision: number;
  }>(
    `SELECT i.product_id,i.store_id,i.source_hash,p.record original,i.product,i.revision
    FROM legacy_catalog_imports i JOIN legacy_store_products p ON p.id=i.product_id AND p.store_id=i.store_id
    JOIN legacy_stores s ON s.id=p.store_id JOIN legacy_customers c ON c.id=s.customer_id AND c.user_id=$1
    JOIN legacy_product_recoveries r ON r.run_id=i.run_id AND r.product_id=i.product_id AND r.user_id=$1 AND r.status='recovered'
    JOIN legacy_catalog_recovery_runs run ON run.id=i.run_id AND run.applied_at IS NOT NULL
    WHERE i.user_id=$1 AND i.run_id=$2 ORDER BY i.product_id LIMIT 30 OFFSET $3`,
    [userId, LEGACY_CATALOG_RUN, (Math.max(1, page) - 1) * 30],
  );
  return rows.filter((row) => legacyRecordHash(row.original) === row.source_hash);
}

export async function importedProduct(client: Client, userId: string, productId: string) {
  if (!z.guid().safeParse(productId).success) return null;
  const {
    rows: [row],
  } = await client.query<{
    product_id: string;
    store_id: string;
    source_hash: string;
    original: unknown;
    product: RestoredProduct;
    revision: number;
  }>(
    `SELECT i.product_id,i.store_id,i.source_hash,p.record original,i.product,i.revision
    FROM legacy_catalog_imports i JOIN legacy_store_products p ON p.id=i.product_id AND p.store_id=i.store_id
    JOIN legacy_stores s ON s.id=p.store_id JOIN legacy_customers c ON c.id=s.customer_id AND c.user_id=$1
    JOIN legacy_product_recoveries r ON r.run_id=i.run_id AND r.product_id=i.product_id AND r.user_id=$1 AND r.status='recovered'
    JOIN legacy_catalog_recovery_runs run ON run.id=i.run_id AND run.applied_at IS NOT NULL
    WHERE i.user_id=$1 AND i.run_id=$2 AND i.product_id=$3::uuid`,
    [userId, LEGACY_CATALOG_RUN, productId],
  );
  return row && legacyRecordHash(row.original) === row.source_hash ? row : null;
}

export async function recoveredProduct(client: Client, userId: string, productId: string) {
  if (!z.guid().safeParse(productId).success) return null;
  const {
    rows: [scope],
  } = await client.query<{ store_id: string }>(
    `SELECT p.store_id FROM legacy_store_products p
    JOIN legacy_stores s ON s.id=p.store_id JOIN legacy_customers c ON c.id=s.customer_id AND c.user_id=$1
    WHERE p.id=$2::uuid`,
    [userId, productId],
  );
  if (!scope) return null;
  const [row] = await readRecoveredLegacyCatalog(client, userId, scope.store_id, {
    runId: LEGACY_CATALOG_RUN,
    productIds: [productId],
    recoveredOnly: true,
  });
  return row?.status === 'recovered' ? row.product : null;
}

export async function importRecoveredProducts(
  pool: Pick<Pool, 'connect'>,
  userId: string,
  input: unknown,
) {
  const parsed = recoveredSelectionSchema.parse(input);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rows = await readRecoveredLegacyCatalog(client, userId, parsed.storeId, {
      runId: LEGACY_CATALOG_RUN,
      productIds: parsed.productIds,
      recoveredOnly: true,
      lock: true,
    });
    if (
      rows.length !== parsed.productIds.length ||
      rows.some((row) => row.status !== 'recovered' || !row.product)
    )
      throw new Error('Recovered products are unavailable for this account.');
    const payload = rows.map((row) => ({
      productId: row.id,
      sourceHash: row.sourceHash,
      product: row.product,
    }));
    const saved = await client.query(
      `INSERT INTO legacy_catalog_imports(user_id,run_id,product_id,store_id,source_hash,product)
      SELECT $1,$2,p.id,p.store_id,x->>'sourceHash',x->'product' FROM jsonb_array_elements($3::jsonb) x
      JOIN legacy_store_products p ON p.id=(x->>'productId')::uuid
      JOIN legacy_stores s ON s.id=p.store_id JOIN legacy_customers c ON c.id=s.customer_id AND c.user_id=$1
      JOIN legacy_product_recoveries r ON r.run_id=$2 AND r.product_id=p.id AND r.user_id=$1 AND r.status='recovered' AND r.source_hash=x->>'sourceHash'
      ON CONFLICT (user_id,product_id) DO NOTHING RETURNING product_id`,
      [userId, LEGACY_CATALOG_RUN, JSON.stringify(payload)],
    );
    await client.query('COMMIT');
    return saved.rowCount ?? 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function reviewImportedProduct(client: Client, userId: string, input: unknown) {
  const parsed = catalogReviewSchema.parse(input);
  const row = await importedProduct(client, userId, parsed.productId);
  if (!row) return false;
  const product = {
    ...row.product,
    title: parsed.title,
    description: parsed.description,
    priceCents: parsed.price,
  };
  const saved = await client.query(
    `UPDATE legacy_catalog_imports i SET product=$4::jsonb,revision=revision+1,updated_at=now()
    FROM legacy_store_products p JOIN legacy_stores s ON s.id=p.store_id JOIN legacy_customers c ON c.id=s.customer_id
    WHERE i.user_id=$1 AND c.user_id=$1 AND i.product_id=$2::uuid AND i.run_id=$3 AND i.revision=$5
      AND p.id=i.product_id AND p.store_id=i.store_id AND p.record=$6::jsonb RETURNING i.id`,
    [
      userId,
      parsed.productId,
      LEGACY_CATALOG_RUN,
      JSON.stringify(product),
      parsed.revision,
      JSON.stringify(row.original),
    ],
  );
  return saved.rowCount === 1;
}
