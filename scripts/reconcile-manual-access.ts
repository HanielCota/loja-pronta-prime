import { Pool, type PoolClient } from 'pg';

/** Only dated, active, non-revoked purchases belonging to this exact account are evidence. */
const evidence = `WITH evidence AS (
  SELECT p.user_id, m.access AS product, p.expires_at
  FROM hotmart_purchases p JOIN hotmart_product_mappings m ON m.product_ucode=p.product_ucode
  WHERE p.active AND p.purchased_at <= now() AND p.expires_at IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM hotmart_purchase_access_revocations r
      WHERE r.transaction=p.transaction AND r.product=m.access)
  UNION ALL
  SELECT user_id, 'sll', expires_at FROM historical_sll_purchases
  WHERE active AND revoked_at IS NULL AND purchased_at <= now()
), terms AS (
  SELECT user_id, product, max(expires_at) AS expires_at FROM evidence GROUP BY user_id,product
)`;

/** Preview by default. A rerun cannot extend a dated grant or restore a removed one. */
export async function reconcileManualAccess(pool: Pool, apply = false) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Same mapping lock as imports; prevents purchase/admin changes during reconciliation.
    if (apply)
      await client.query("SELECT pg_advisory_xact_lock(hashtext('hotmart-product-mappings'))");
    const before = await counts(client);
    let updated = 0;
    if (apply) {
      const result = await client.query(`${evidence}, changed AS (
        UPDATE manual_product_grants g SET expires_at=t.expires_at FROM terms t
        WHERE g.user_id=t.user_id AND g.product=t.product AND g.expires_at IS NULL
        RETURNING g.user_id,g.product,g.expires_at
      ) INSERT INTO product_access_events(id,target_user_id,product,action,reason,expires_at)
        SELECT gen_random_uuid()::text,user_id,product,'granted',
          'Prazo da liberação antiga conferido pelos registros de compra; vencimento original preservado',expires_at
        FROM changed RETURNING id`);
      updated = result.rowCount ?? 0;
    }
    const after = await counts(client);
    await client.query('COMMIT');
    return { apply, before, updated, after };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function counts(client: PoolClient) {
  const {
    rows: [row],
  } = await client.query(`${evidence}
    SELECT count(*)::int AS undated,
      count(t.expires_at)::int AS backed_by_purchase,
      count(*) FILTER (WHERE t.expires_at <= now())::int AS expired_by_purchase,
      count(*) FILTER (WHERE t.expires_at IS NULL)::int AS needs_review
    FROM manual_product_grants g LEFT JOIN terms t ON t.user_id=g.user_id AND t.product=g.product
    WHERE g.expires_at IS NULL`);
  return row as {
    undated: number;
    backed_by_purchase: number;
    expired_by_purchase: number;
    needs_review: number;
  };
}

if (import.meta.main) {
  if (process.argv.slice(2).some((arg) => arg !== '--apply'))
    throw new Error('Usage: reconcile-manual-access [--apply]');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    console.log(
      JSON.stringify(await reconcileManualAccess(pool, process.argv.includes('--apply')), null, 2),
    );
  } finally {
    await pool.end();
  }
}
