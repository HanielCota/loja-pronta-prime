import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { hashPassword } from 'better-auth/crypto';
import { Pool } from 'pg';
import { z } from 'zod';
import { purchaseExpiresAt } from '../src/features/products/access-term';
import { DEFAULT_STUDENT_PASSWORD } from '../src/server/auth/student-password';

const purchaseSchema = z
  .object({
    sourceRow: z.number().int().min(2),
    transaction: z.string().regex(/^HP[A-Za-z0-9]{1,198}$/),
    email: z.email().max(254),
    name: z.string().min(1).max(200),
    sourceProductId: z.enum(['3454404', '5398231', '5398081']),
    product: z.literal('sll'),
    purchasedAt: z.iso.datetime(),
    confirmedAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    eligibility: z.enum(['eligible', 'expired']),
  })
  .strict();
export type SalesHistoryInput = {
  sourceSha256: string;
  preparedSha256: string;
  purchases: z.infer<typeof purchaseSchema>[];
};

export async function readSalesHistory(directory: string): Promise<SalesHistoryInput> {
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  const sourceSha256 = z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .parse(manifest.sourceSha256);
  if (manifest.reportUtcOffset !== '-03:00') throw new Error('Unexpected report UTC offset.');
  const content = await readFile(path.join(directory, 'purchases.json'), 'utf8');
  const purchases = z.array(purchaseSchema).min(1).parse(JSON.parse(content));
  const transactions = new Set<string>();
  for (const p of purchases) {
    if (
      transactions.has(p.transaction) ||
      p.email !== p.email.trim().toLowerCase() ||
      purchaseExpiresAt(new Date(p.purchasedAt)).toISOString() !== p.expiresAt ||
      p.confirmedAt < p.purchasedAt
    )
      throw new Error('Inconsistent prepared purchase.');
    transactions.add(p.transaction);
  }
  if (purchases.length !== manifest.preparedPurchases) throw new Error('Prepared count mismatch.');
  return {
    sourceSha256,
    preparedSha256: createHash('sha256').update(content).digest('hex'),
    purchases,
  };
}

/** Preview by default. One atomic import never overwrites purchases, credentials or grants. */
export async function importSalesHistory(pool: Pool, input: SalesHistoryInput, apply = false) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Exclusive mapping lock pauses webhook/admin access mutations while the preview is applied.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('hotmart-product-mappings'))");
    const existing = await client.query<{ prepared_sha256: string }>(
      'SELECT prepared_sha256 FROM sales_history_imports WHERE source_sha256=$1',
      [input.sourceSha256],
    );
    if (existing.rows.length) {
      if (existing.rows[0]!.prepared_sha256 !== input.preparedSha256)
        throw new Error('Source already imported with different prepared content.');
      await client.query('ROLLBACK');
      return { alreadyImported: true };
    }
    await client.query(`CREATE TEMP TABLE sales_import_rows (
      transaction text primary key, email text not null, name text not null,
      product_id text not null, purchased_at timestamptz not null, expires_at timestamptz not null
    ) ON COMMIT DROP`);
    for (let offset = 0; offset < input.purchases.length; offset += 1000) {
      const rows = input.purchases.slice(offset, offset + 1000).map((p) => ({
        transaction: p.transaction,
        email: p.email,
        name: p.name,
        product_id: p.sourceProductId,
        purchased_at: p.purchasedAt,
        expires_at: p.expiresAt,
      }));
      await client.query(
        `INSERT INTO sales_import_rows SELECT * FROM jsonb_to_recordset($1::jsonb)
        AS x(transaction text,email text,name text,product_id text,purchased_at timestamptz,expires_at timestamptz)`,
        [JSON.stringify(rows)],
      );
    }
    const duplicates = await client.query(`SELECT lower(btrim(email)) FROM "user"
      WHERE lower(btrim(email)) IN (SELECT email FROM sales_import_rows)
      GROUP BY lower(btrim(email)) HAVING count(*) > 1`);
    if (duplicates.rows.length)
      throw new Error('Destination contains ambiguous normalized emails.');
    // Account locks follow the same order as account administration and protect role/password edits.
    await client.query(`SELECT id FROM "user" WHERE lower(btrim(email)) IN
      (SELECT email FROM sales_import_rows) ORDER BY id FOR UPDATE`);
    await client.query(`CREATE TEMP TABLE sales_import_candidates ON COMMIT DROP AS
      SELECT r.*, u.id AS user_id FROM sales_import_rows r
      LEFT JOIN "user" u ON lower(btrim(u.email))=r.email
      WHERE NOT EXISTS (SELECT 1 FROM hotmart_purchases p WHERE p.transaction=r.transaction)
        AND NOT EXISTS (SELECT 1 FROM historical_sll_purchases h WHERE h.transaction=r.transaction)
        AND (u.id IS NULL OR (coalesce(u.role,'user')='user' AND NOT coalesce(u.banned,false)))
        AND NOT EXISTS (SELECT 1 FROM product_access_events e WHERE e.target_user_id=u.id
          AND e.product='sll' AND e.action='revoked' AND e.created_at >= r.purchased_at)`);
    const { rows: accounts } = await client.query<{ email: string; name: string }>(
      `SELECT DISTINCT ON (email) email,name FROM sales_import_candidates
       WHERE user_id IS NULL AND purchased_at <= now() AND expires_at > now() ORDER BY email,purchased_at DESC`,
    );
    const { rows: counts } = await client.query(`SELECT
      (SELECT count(*)::int FROM sales_import_rows) AS source_purchases,
      count(*)::int AS candidate_purchases,
      count(*) FILTER (WHERE purchased_at <= now() AND expires_at > now())::int AS unexpired_purchases,
      count(DISTINCT email) FILTER (WHERE purchased_at <= now() AND expires_at > now())::int AS eligible_emails
      FROM sales_import_candidates`);
    const preview = { ...counts[0], newAccounts: accounts.length, storeGrants: 0 };
    if (!apply) {
      await client.query('ROLLBACK');
      return { applied: false, ...preview };
    }
    await client.query(
      'INSERT INTO sales_history_imports(source_sha256,prepared_sha256) VALUES($1,$2)',
      [input.sourceSha256, input.preparedSha256],
    );
    // Separate salts preserve the authentication library's credential format for every new account.
    for (let offset = 0; offset < accounts.length; offset += 4) {
      const group = await Promise.all(
        accounts.slice(offset, offset + 4).map(async (a) => ({
          ...a,
          id: randomUUID(),
          password: await hashPassword(DEFAULT_STUDENT_PASSWORD),
        })),
      );
      for (const a of group) {
        // Do not replace a concurrent existing account or reset any existing credential.
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO "user"
          (id,email,name,role,email_verified,must_change_password,updated_at)
          VALUES($1,$2,$3,'user',true,false,now()) ON CONFLICT(email) DO NOTHING RETURNING id`,
          [a.id, a.email, a.name],
        );
        if (inserted.rows.length)
          await client.query(
            `INSERT INTO account
          (id,account_id,provider_id,user_id,password,updated_at)
          VALUES($1,$2,'credential',$2,$3,now())`,
            [randomUUID(), a.id, a.password],
          );
      }
      if (offset % 1000 === 0)
        console.info(
          `Prepared ${Math.min(offset + 4, accounts.length)} of ${accounts.length} new accounts.`,
        );
    }
    // An account can be created only for a purchase that is still valid at the actual import time.
    await client.query(
      `INSERT INTO historical_sll_purchases
      (transaction,source_sha256,source_product_id,buyer_email,user_id,purchased_at,expires_at)
      SELECT r.transaction,$1,r.product_id,r.email,u.id,r.purchased_at,r.expires_at
      FROM sales_import_candidates r LEFT JOIN "user" u ON lower(btrim(u.email))=r.email
      WHERE u.id IS NULL OR (coalesce(u.role,'user')='user' AND NOT coalesce(u.banned,false))
      ON CONFLICT(transaction) DO NOTHING`,
      [input.sourceSha256],
    );
    const granted = await client.query(
      `INSERT INTO student_products(user_id,product)
      SELECT DISTINCT h.user_id,'sll' FROM historical_sll_purchases h
      WHERE h.source_sha256=$1 AND h.user_id IS NOT NULL AND h.active AND h.revoked_at IS NULL
        AND h.purchased_at <= now() AND h.expires_at > clock_timestamp()
      ON CONFLICT DO NOTHING RETURNING user_id`,
      [input.sourceSha256],
    );
    await client.query(
      `INSERT INTO product_access_events(id,target_user_id,product,action,reason)
      SELECT 'sales-history:' || $1 || ':' || h.user_id,h.user_id,'sll','granted',$2
      FROM historical_sll_purchases h WHERE h.source_sha256=$1 AND h.user_id IS NOT NULL
        AND h.active AND h.revoked_at IS NULL AND h.purchased_at <= now() AND h.expires_at > clock_timestamp()
      GROUP BY h.user_id ON CONFLICT DO NOTHING`,
      [input.sourceSha256, `Historical SLL import ${input.sourceSha256}`],
    );
    await client.query('COMMIT');
    return { applied: true, ...preview, newMemberships: granted.rowCount };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const directory = args.find((a) => a.startsWith('--input='))?.slice(8);
  if (!directory || args.some((a) => !a.startsWith('--input=') && a !== '--apply'))
    throw new Error('Usage: import-sales-history --input=/private/prepared-directory [--apply]');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  try {
    console.info(
      JSON.stringify(
        await importSalesHistory(pool, await readSalesHistory(directory), args.includes('--apply')),
      ),
    );
  } catch (error) {
    console.error(`Sales import failed: ${error instanceof Error ? error.name : 'UnknownError'}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
