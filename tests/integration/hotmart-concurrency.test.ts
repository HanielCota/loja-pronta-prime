import { afterAll, beforeAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/server/db/schema';

const applicationName = `hotmart-race-${randomUUID()}`;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  application_name: applicationName,
});
const database = drizzle(pool, { schema });
const userId = randomUUID(),
  code = randomUUID(),
  transaction = randomUUID();
mock.module('@/server/db', () => ({ db: database }));
mock.module('next/cache', () => ({ revalidateTag: () => {} }));
const { processHotmartEvent } = await import('@/features/hotmart/server/process-event');

const event = (time: number) => ({
  id: randomUUID(),
  event: 'PURCHASE_APPROVED',
  version: '2.0.0',
  creation_date: time,
  data: {
    buyer: { email: `${userId}@example.invalid` },
    product: { ucode: code },
    purchase: { transaction, order_date: Date.now() - 1000 },
  },
});
beforeAll(async () => {
  await database
    .insert(schema.user)
    .values({ id: userId, name: 'Compradora', email: `${userId}@example.invalid` });
  await database
    .insert(schema.hotmartProductMappings)
    .values({ productUcode: code, access: 'sll', primary: false });
});
afterAll(async () => {
  await pool.query('delete from hotmart_events where product_ucode=$1', [code]);
  await pool.query('delete from hotmart_purchases where transaction=$1', [transaction]);
  await pool.query('delete from hotmart_product_mappings where product_ucode=$1', [code]);
  await pool.query('delete from "user" where id=$1', [userId]);
  await pool.end();
});

test('an in-flight event cannot undo a manual area revocation', async () => {
  const time = Date.now();
  await processHotmartEvent(event(time));
  const blocker = await pool.connect();
  let incoming: Promise<string> | undefined;
  try {
    await blocker.query('begin');
    // The administrative action holds this lock while excluding an area and removing access.
    await blocker.query('select pg_advisory_xact_lock(hashtext($1))', [userId]);
    await blocker.query(
      'select transaction from hotmart_purchases where transaction=$1 for update',
      [transaction],
    );
    incoming = processHotmartEvent(event(time + 1000));
    const deadline = Date.now() + 5000;
    let waiting = false;
    while (Date.now() < deadline) {
      const { rows } = await pool.query(
        "select 1 from pg_stat_activity where application_name=$1 and wait_event in ('advisory','transactionid')",
        [applicationName],
      );
      if (rows.length) {
        waiting = true;
        break;
      }
      await Bun.sleep(20);
    }
    expect(waiting).toBe(true);
    await blocker.query(
      "insert into hotmart_purchase_access_revocations (transaction,product) values ($1,'sll')",
      [transaction],
    );
    await blocker.query("delete from student_products where user_id=$1 and product='sll'", [
      userId,
    ]);
    await blocker.query('commit');
    expect(await incoming).toBe('Compra aprovada; acesso liberado.');
    expect(
      (await pool.query('select active from hotmart_purchases where transaction=$1', [transaction]))
        .rows[0]?.active,
    ).toBe(true);
    expect(
      (await pool.query('select 1 from student_products where user_id=$1', [userId])).rowCount,
    ).toBe(0);
  } finally {
    await blocker.query('rollback');
    blocker.release();
    await incoming?.catch(() => {});
  }
}, 15_000);
