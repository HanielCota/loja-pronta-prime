import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { hashPassword } from 'better-auth/crypto';
import { Pool, type PoolClient } from 'pg';
import {
  normalizeLegacyEmail,
  validateLegacySnapshot,
  type LegacySnapshot,
} from '../src/features/legacy-stores/model';
import { DEFAULT_STUDENT_PASSWORD } from '../src/server/auth/student-password';

const SOURCE_PROJECT = 'voslzzgajgatdcrueikw';
const files = {
  customers: ['clientes', 'customers.json'],
  stores: ['lojas', 'stores.json'],
  products: ['produtos_loja', 'products.json'],
  purchases: ['referencias_hotmart', 'purchases.json'],
} as const;

export async function readLegacyImport(directory: string) {
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8')) as {
    project: string;
    exportedAt: string;
    tables: Record<string, { rows: number; sha256: string }>;
  };
  if (manifest.project !== SOURCE_PROJECT || !Number.isFinite(Date.parse(manifest.exportedAt)))
    throw new Error('Unexpected source project or export date.');
  const input: Record<string, unknown> = {};
  const digest = createHash('sha256').update(manifest.project);
  for (const [key, [table, file]] of Object.entries(files)) {
    const data = await readFile(path.join(directory, file));
    const hash = createHash('sha256').update(data).digest('hex');
    if (hash !== manifest.tables[table]?.sha256) throw new Error(`Checksum mismatch: ${table}`);
    const rows: unknown = JSON.parse(data.toString('utf8'));
    if (!Array.isArray(rows) || rows.length !== manifest.tables[table]?.rows)
      throw new Error(`Row count mismatch: ${table}`);
    input[key] = rows;
    digest.update(hash);
  }
  return { snapshot: validateLegacySnapshot(input), id: digest.digest('hex'), manifest };
}

async function existingAccounts(client: PoolClient, emails: string[]) {
  const { rows } = await client.query<{
    id: string;
    email: string;
    role: string | null;
    banned: boolean | null;
    revoked: boolean;
    has_password: boolean;
  }>(
    `SELECT u.id, lower(trim(u.email)) AS email, u.role, u.banned,
      (EXISTS (SELECT 1 FROM hotmart_purchases hp
        JOIN hotmart_product_mappings m ON m.product_ucode=hp.product_ucode
        WHERE hp.user_id=u.id AND NOT hp.active AND m.access='loja-pronta')
       OR (SELECT e.action FROM product_access_events e WHERE e.target_user_id=u.id
           AND e.product='loja-pronta' ORDER BY e.created_at DESC,e.id DESC LIMIT 1)='revoked') IS TRUE AS revoked,
      EXISTS (SELECT 1 FROM account a WHERE a.user_id=u.id AND a.provider_id='credential'
              AND a.password IS NOT NULL) AS has_password
    FROM "user" u WHERE lower(trim(u.email))=ANY($1::text[])`,
    [emails],
  );
  if (new Set(rows.map((r) => r.email)).size !== rows.length)
    throw new Error('Destination has duplicate normalized emails; resolve them before importing.');
  return new Map(rows.map((row) => [row.email, row]));
}

// Bounded JSON batches avoid SQL interpolation and keep product descriptions out of logs.
async function writeRecords(
  client: PoolClient,
  snapshot: LegacySnapshot,
  users: Map<string, { id: string }>,
) {
  const customers = snapshot.customers.map((record) => ({
    record,
    user_id: users.get(normalizeLegacyEmail(record.email))!.id,
  }));
  const operations: [unknown[], string][] = [
    [
      customers,
      `INSERT INTO legacy_customers(id,user_id,record)
      SELECT (x->'record'->>'id')::uuid,x->>'user_id',x->'record' FROM jsonb_array_elements($1::jsonb) x
      ON CONFLICT(id) DO NOTHING`,
    ],
    [
      snapshot.stores,
      `INSERT INTO legacy_stores(id,customer_id,record)
      SELECT (x->>'id')::uuid,(x->>'cliente_id')::uuid,x FROM jsonb_array_elements($1::jsonb) x
      ON CONFLICT(id) DO NOTHING`,
    ],
    [
      snapshot.products,
      `INSERT INTO legacy_store_products(id,store_id,record)
      SELECT (x->>'id')::uuid,(x->>'loja_id')::uuid,x FROM jsonb_array_elements($1::jsonb) x
      ON CONFLICT(id) DO NOTHING`,
    ],
    [
      snapshot.purchases,
      `INSERT INTO legacy_purchase_references(transaction_id,customer_id,store_id,record)
      SELECT x->>'transacao_id',(x->>'cliente_id')::uuid,(x->>'loja_id')::uuid,x
      FROM jsonb_array_elements($1::jsonb) x ON CONFLICT(transaction_id) DO NOTHING`,
    ],
  ];
  for (const [records, sql] of operations)
    for (let start = 0; start < records.length; start += 500)
      await client.query(sql, [JSON.stringify(records.slice(start, start + 500))]);
}

export async function verifyLegacyRecords(client: PoolClient, snapshot: LegacySnapshot) {
  const tables = [
    ['legacy_customers', 'id', 'id', snapshot.customers],
    ['legacy_stores', 'id', 'id', snapshot.stores],
    ['legacy_store_products', 'id', 'id', snapshot.products],
    ['legacy_purchase_references', 'transaction_id', 'transacao_id', snapshot.purchases],
  ] as const;
  for (const [table, key, sourceKey, records] of tables) {
    for (let start = 0; start < records.length; start += 500) {
      const batch = records.slice(start, start + 500);
      // Identifiers come only from the fixed list above, never from the export.
      const {
        rows: [result],
      } = await client.query<{ matched: number }>(
        `SELECT count(*)::int AS matched FROM jsonb_array_elements($1::jsonb) x
         JOIN ${table} t ON t.${key}::text=x->>'${sourceKey}' AND t.record=x`,
        [JSON.stringify(batch)],
      );
      if (result?.matched !== batch.length)
        throw new Error(`Imported records differ from source: ${table}`);
    }
  }
  const {
    rows: [result],
  } = await client.query<{ missing: number }>(
    `SELECT count(*)::int AS missing FROM legacy_customers c
     LEFT JOIN "user" u ON u.id=c.user_id
     WHERE u.id IS NULL OR lower(trim(u.email))<>lower(trim(c.record->>'email'))`,
  );
  if (result?.missing) throw new Error('Imported customer account mapping is incomplete.');
}

export async function importLegacyStores(
  pool: Pool,
  input: Awaited<ReturnType<typeof readLegacyImport>>,
  apply: boolean,
) {
  const { snapshot, id, manifest } = input;
  const emails = snapshot.customers.map((row) => normalizeLegacyEmail(row.email));
  let client = await pool.connect();
  let existing: Awaited<ReturnType<typeof existingAccounts>>;
  try {
    await client.query('BEGIN READ ONLY');
    existing = await existingAccounts(client, emails);
    const { rows } = await client.query('SELECT id FROM legacy_store_imports WHERE id=$1', [id]);
    if (rows.length) {
      await verifyLegacyRecords(client, snapshot);
      await client.query('ROLLBACK');
      return { alreadyImported: true, newAccounts: 0, granted: 0, skipped: 0 };
    }
    const { rows: prior } = await client.query(
      'SELECT id FROM legacy_store_imports WHERE source_project=$1',
      [manifest.project],
    );
    if (prior.length)
      throw new Error('A different snapshot was imported already; reconcile changes explicitly.');
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
  const missing = snapshot.customers.filter(
    (row) => !existing.has(normalizeLegacyEmail(row.email)),
  );
  const protectedAccounts = [...existing.values()].filter(
    (u) => u.banned || u.revoked || (u.role && u.role !== 'user'),
  );
  console.info(
    JSON.stringify({
      sourceCustomers: snapshot.customers.length,
      sourceStores: snapshot.stores.length,
      sourceProducts: snapshot.products.length,
      sourcePurchases: snapshot.purchases.length,
      newAccounts: missing.length,
      matchedAccounts: existing.size,
      protectedAccounts: protectedAccounts.length,
      existingStudentsWithoutPassword: [...existing.values()].filter(
        (u) => (!u.role || u.role === 'user') && !u.has_password,
      ).length,
      previewOnly: !apply,
    }),
  );
  if (!apply)
    return {
      alreadyImported: false,
      newAccounts: missing.length,
      granted: 0,
      skipped: protectedAccounts.length,
    };

  // Hash before the write transaction. Each new account gets a separate random salt.
  const prepared = new Map<string, string>();
  let cursor = 0;
  let preparedCount = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (cursor < missing.length) {
        const row = missing[cursor++];
        if (row) {
          prepared.set(
            normalizeLegacyEmail(row.email),
            await hashPassword(DEFAULT_STUDENT_PASSWORD),
          );
          preparedCount++;
          if (preparedCount % 1000 === 0)
            console.info(`Prepared ${preparedCount}/${missing.length} new credentials.`);
        }
      }
    }),
  );
  client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query("SET LOCAL lock_timeout = '15s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('legacy-store-import'))");
    const { rows: prior } = await client.query(
      'SELECT id FROM legacy_store_imports WHERE source_project=$1',
      [manifest.project],
    );
    if (prior.length)
      throw new Error(
        'Another import completed while credentials were prepared; run the preview again.',
      );
    existing = await existingAccounts(client, emails);
    let created = 0;
    const createdIds = new Set<string>();
    for (const row of snapshot.customers) {
      const email = normalizeLegacyEmail(row.email);
      if (existing.has(email)) continue;
      const password = prepared.get(email);
      if (!password) throw new Error('Destination accounts changed during import preparation.');
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO "user"(id,name,email,email_verified,must_change_password,role)
         VALUES($1,$2,$3,true,false,'user') ON CONFLICT(email) DO NOTHING RETURNING id`,
        [randomUUID(), row.nome?.trim() || email.split('@')[0], email],
      );
      if (rows[0]) {
        const userId = rows[0].id;
        await client.query(
          `INSERT INTO account(id,account_id,provider_id,user_id,password,updated_at)
          VALUES($1,$2,'credential',$2,$3,now())`,
          [randomUUID(), userId, password],
        );
        created++;
        createdIds.add(userId);
      }
    }
    existing = await existingAccounts(client, emails);
    await writeRecords(client, snapshot, existing);
    const granted = 0;
    let skipped = 0;
    for (const account of existing.values()) {
      if (account.banned || account.revoked || (account.role && account.role !== 'user')) {
        skipped++;
        continue;
      }
      // New accounts are invisible to other transactions until commit and need no shared lock.
      if (!createdIds.has(account.id))
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [account.id]);
      const current = createdIds.has(account.id)
        ? account
        : (await existingAccounts(client, [account.email])).get(account.email);
      if (
        !current ||
        current.banned ||
        current.revoked ||
        (current.role && current.role !== 'user')
      ) {
        skipped++;
        continue;
      }
      // Store references do not establish a paid access term. Membership must come from a
      // dated Hotmart purchase or an explicit dated administrative grant, never this import.
      skipped++;
    }
    await verifyLegacyRecords(client, snapshot);
    await client.query(
      `INSERT INTO legacy_store_imports
      (id,source_project,exported_at,customer_count,store_count,product_count,purchase_count)
      VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [
        id,
        manifest.project,
        manifest.exportedAt,
        snapshot.customers.length,
        snapshot.stores.length,
        snapshot.products.length,
        snapshot.purchases.length,
      ],
    );
    await client.query('COMMIT');
    return { alreadyImported: false, newAccounts: created, granted, skipped };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const directory = args.find((arg) => arg.startsWith('--input='))?.slice('--input='.length);
  if (!directory || args.some((arg) => !arg.startsWith('--input=') && arg !== '--apply'))
    throw new Error('Usage: import-legacy-stores --input=/private/snapshot [--apply]');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  try {
    const input = await readLegacyImport(directory);
    console.info(JSON.stringify(await importLegacyStores(pool, input, args.includes('--apply'))));
  } catch (error) {
    // Never print source rows, credentials, or database error details containing personal data.
    console.error(`Legacy import failed: ${error instanceof Error ? error.name : 'UnknownError'}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
