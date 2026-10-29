import { afterAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import * as s from '@/server/db/schema';
import { reconcileManualAccess } from '../../scripts/reconcile-manual-access';
import { reconcileProductAccess } from '@/features/hotmart/server/product-access';
import { getAccessValidity } from '@/features/products/server/access-validity';
import { getStudentProducts, requireProductAction } from '@/features/products/server/access';

let adminId = '';
let currentUser = '';
mock.module('@/features/admin/server/access', () => ({
  requireAdmin: async () => ({ user: { id: adminId } }),
}));
mock.module('@/features/auth/server/session', () => ({
  getVisit: async () => null,
  getActiveSession: async () => ({ user: { id: currentUser } }),
  needsFirstPassword: () => false,
}));
mock.module('next/cache', () => ({
  revalidateTag: () => {},
  revalidatePath: () => {},
  refresh: () => {},
  unstable_cache: (fn: unknown) => fn,
}));
mock.module('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found');
  },
  unstable_rethrow: () => {},
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
const { changeStudentProductAccess } = await import('@/features/admin/server/actions');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const users: string[] = [],
  codes: string[] = [],
  sources: string[] = [];
const DAY = 86400000;
async function account() {
  const id = randomUUID();
  users.push(id);
  const email = `${id}@example.invalid`;
  await db.insert(s.user).values({ id, name: 'Term review', email });
  return { id, email };
}
async function purchase(
  id: string,
  product: 'sll' | 'loja-pronta',
  expiresAt: Date,
  revoked = false,
) {
  const code = randomUUID();
  const transaction = randomUUID();
  codes.push(code);
  await db.insert(s.hotmartProductMappings).values({ productUcode: code, access: product });
  await db.insert(s.hotmartPurchases).values({
    transaction,
    userId: id,
    buyerEmail: `${id}@example.invalid`,
    productUcode: code,
    active: true,
    purchasedAt: new Date(Date.now() - DAY * 180),
    expiresAt,
    lastEventAt: new Date(),
  });
  if (revoked) await db.insert(s.hotmartPurchaseAccessRevocations).values({ transaction, product });
}
function form(email: string, date: string) {
  const result = new FormData();
  for (const [key, value] of Object.entries({
    email,
    product: 'sll',
    action: 'granted',
    reason: 'Verified purchase receipt',
    termMode: 'until',
    termDate: date,
  }))
    result.set(key, value);
  return result;
}
afterAll(async () => {
  await pool.query('delete from "user" where id=any($1::text[])', [users]);
  await pool.query('delete from hotmart_product_mappings where product_ucode=any($1::text[])', [
    codes,
  ]);
  await pool.query('delete from hotmart_purchases where product_ucode=any($1::text[])', [codes]);
  await pool.query('delete from historical_sll_purchases where source_sha256=any($1::text[])', [
    sources,
  ]);
  await pool.query('delete from sales_history_imports where source_sha256=any($1::text[])', [
    sources,
  ]);
  await pool.end();
  await (globalThis as unknown as { pgPool: Pool }).pgPool.end();
});

test('admin grants require a deadline, permit correction, audit it and do not reset membership', async () => {
  adminId = (await account()).id;
  const target = await account();
  const future = new Date(Date.now() + 45 * DAY).toISOString().slice(0, 10);
  const data = form(target.email, '');
  expect((await changeStudentProductAccess({ message: '', saved: false }, data)).saved).toBe(false);
  expect(
    await db.query.manualProductGrants.findFirst({
      where: eq(s.manualProductGrants.userId, target.id),
    }),
  ).toBeUndefined();
  data.set('termDate', future);
  expect((await changeStudentProductAccess({ message: '', saved: false }, data)).saved).toBe(true);
  const membership = await db.query.studentProducts.findFirst({
    where: eq(s.studentProducts.userId, target.id),
  });
  const expected = new Date(`${future}T23:59:59.999-03:00`);
  expect((await getAccessValidity(target.id)).byProduct.sll).toEqual({
    kind: 'until',
    expiresAt: expected,
  });
  expect((await changeStudentProductAccess({ message: '', saved: false }, data)).saved).toBe(false);
  const shorter = new Date(Date.now() + 5 * DAY).toISOString().slice(0, 10);
  data.set('termDate', shorter);
  expect((await changeStudentProductAccess({ message: '', saved: false }, data)).saved).toBe(true);
  const events = await db.query.productAccessEvents.findMany({
    where: eq(s.productAccessEvents.targetUserId, target.id),
  });
  expect(events).toHaveLength(2);
  expect(events.map((event) => event.expiresAt?.toISOString()).toSorted()).toEqual(
    [expected.toISOString(), new Date(`${shorter}T23:59:59.999-03:00`).toISOString()].toSorted(),
  );
  expect(
    (await db.query.studentProducts.findFirst({ where: eq(s.studentProducts.userId, target.id) }))
      ?.grantedAt,
  ).toEqual(membership!.grantedAt);
  data.set('termDate', new Date(Date.now() - 2 * DAY).toISOString().slice(0, 10));
  const expiredResult = await changeStudentProductAccess({ message: '', saved: false }, data);
  expect(expiredResult.saved).toBe(true);
  expect(expiredResult.message).toContain('Prazo vencido registrado');
  currentUser = target.id;
  expect((await getStudentProducts(target.id)).products).toEqual([]);
  await expect(requireProductAction('sll')).rejects.toThrow('redirect:/');
  expect((await getAccessValidity(target.id)).byProduct.sll).toBeUndefined();
  await db.transaction((tx) => reconcileProductAccess(tx, target.id, 'sll'));
  expect(
    await db.query.studentProducts.findFirst({ where: eq(s.studentProducts.userId, target.id) }),
  ).toBeUndefined();
});

test('manual expiry cannot end another valid purchase or the other product', async () => {
  const target = await account();
  const expiresAt = new Date(Date.now() + 100 * DAY);
  await db.insert(s.studentProducts).values([
    { userId: target.id, product: 'sll' },
    { userId: target.id, product: 'loja-pronta' },
  ]);
  await db.insert(s.manualProductGrants).values([
    { userId: target.id, product: 'sll', expiresAt: new Date(Date.now() - DAY) },
    { userId: target.id, product: 'loja-pronta', expiresAt },
  ]);
  await purchase(target.id, 'sll', expiresAt);
  expect((await getStudentProducts(target.id)).products.toSorted()).toEqual(['loja-pronta', 'sll']);
  expect((await getAccessValidity(target.id)).byProduct.sll).toEqual({ kind: 'until', expiresAt });
  await pool.query('update hotmart_purchases set active=false where user_id=$1', [target.id]);
  expect((await getStudentProducts(target.id)).products).toEqual(['loja-pronta']);
});

test('legacy review is read-only by default, preserves exact evidence and never renews on reruns', async () => {
  const backed = await account(),
    unknown = await account(),
    excluded = await account(),
    dated = await account();
  for (const target of [backed, unknown, excluded])
    await db.insert(s.manualProductGrants).values({ userId: target.id, product: 'sll' });
  const fixed = new Date(Date.now() + DAY);
  await db
    .insert(s.manualProductGrants)
    .values({ userId: dated.id, product: 'sll', expiresAt: fixed });
  const expired = new Date(Date.now() - DAY * 10);
  await purchase(backed.id, 'sll', expired);
  await purchase(backed.id, 'loja-pronta', new Date(Date.now() + DAY * 100));
  await purchase(excluded.id, 'sll', fixed, true);
  await purchase(dated.id, 'sll', new Date(Date.now() + DAY * 100));
  const historical = await account();
  const source = randomUUID().replaceAll('-', '').padEnd(64, 'a');
  sources.push(source);
  await db.insert(s.salesHistoryImports).values({ sourceSha256: source, preparedSha256: source });
  await db.insert(s.historicalSllPurchases).values({
    transaction: randomUUID(),
    sourceSha256: source,
    sourceProductId: '3454404',
    buyerEmail: historical.email,
    userId: historical.id,
    purchasedAt: new Date(Date.now() - 100 * DAY),
    expiresAt: fixed,
  });
  await db.insert(s.manualProductGrants).values({ userId: historical.id, product: 'sll' });
  const preview = await reconcileManualAccess(pool);
  expect(preview.updated).toBe(0);
  expect(preview.before.backed_by_purchase).toBeGreaterThan(0);
  expect(
    (
      await db.query.manualProductGrants.findFirst({
        where: eq(s.manualProductGrants.userId, backed.id),
      })
    )?.expiresAt,
  ).toBeNull();
  await reconcileManualAccess(pool, true);
  expect(
    (
      await db.query.manualProductGrants.findFirst({
        where: eq(s.manualProductGrants.userId, backed.id),
      })
    )?.expiresAt,
  ).toEqual(expired);
  for (const target of [unknown, excluded])
    expect(
      (
        await db.query.manualProductGrants.findFirst({
          where: eq(s.manualProductGrants.userId, target.id),
        })
      )?.expiresAt,
    ).toBeNull();
  expect(
    (
      await db.query.manualProductGrants.findFirst({
        where: eq(s.manualProductGrants.userId, dated.id),
      })
    )?.expiresAt,
  ).toEqual(fixed);
  expect(
    (
      await db.query.manualProductGrants.findFirst({
        where: eq(s.manualProductGrants.userId, historical.id),
      })
    )?.expiresAt,
  ).toEqual(fixed);
  expect((await reconcileManualAccess(pool, true)).updated).toBe(0);
  const [audit] = await db
    .select()
    .from(s.productAccessEvents)
    .where(and(eq(s.productAccessEvents.targetUserId, backed.id), sql`expires_at is not null`));
  expect(audit?.expiresAt).toEqual(expired);
});
