import { afterAll, expect, mock, test } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import * as s from '@/server/db/schema';
import { importSalesHistory, type SalesHistoryInput } from '../../scripts/import-sales-history';
import { purchaseExpiresAt } from '@/features/products/access-term';
import { getStudentProducts, requireProductAction } from '@/features/products/server/access';

mock.module('next/cache', () => ({ revalidateTag: () => {}, revalidatePath: () => {} }));
mock.module('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
let currentUser = '';
mock.module('@/features/auth/server/session', () => ({
  getActiveSession: async () => ({ user: { id: currentUser } }),
  needsFirstPassword: () => false,
}));
const { processHotmartEvent } = await import('@/features/hotmart/server/process-event');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const users: string[] = [],
  codes: string[] = [],
  sources: string[] = [];
const digest = () => createHash('sha256').update(randomUUID()).digest('hex');
async function account(extra: { banned?: boolean; role?: string } = {}) {
  const id = randomUUID();
  users.push(id);
  await db.insert(s.user).values({
    id,
    name: 'Existing student',
    email: `${id}@example.invalid`,
    mustChangePassword: false,
    ...extra,
  });
  return { id, email: `${id}@example.invalid` };
}
function input(emails: string[], daysAgo = 30): SalesHistoryInput {
  const sourceSha256 = digest();
  sources.push(sourceSha256);
  return {
    sourceSha256,
    preparedSha256: digest(),
    purchases: emails.map((email, index) => {
      const purchasedAt = new Date(Date.now() - daysAgo * 86400000);
      return {
        sourceRow: index + 2,
        transaction: `HP${Date.now()}${index}${Math.floor(Math.random() * 1000000)}`,
        email,
        name: 'Imported student',
        sourceProductId: '3454404',
        product: 'sll',
        purchasedAt: purchasedAt.toISOString(),
        confirmedAt: purchasedAt.toISOString(),
        expiresAt: purchaseExpiresAt(purchasedAt).toISOString(),
        eligibility: 'eligible',
      };
    }),
  };
}
const notification = (
  email: string,
  transaction: string,
  code: string,
  kind: string,
  orderDate?: number,
) => ({
  id: randomUUID(),
  event: kind,
  version: '2.0.0',
  creation_date: Date.now(),
  data: {
    buyer: { email },
    product: { ucode: code, id: 3454404 },
    purchase: { transaction, ...(orderDate ? { order_date: orderDate } : {}) },
  },
});
afterAll(async () => {
  for (const source of sources) {
    const rows = await pool.query<{ user_id: string }>(
      'DELETE FROM historical_sll_purchases WHERE source_sha256=$1 RETURNING user_id',
      [source],
    );
    users.push(...rows.rows.flatMap((row) => (row.user_id ? [row.user_id] : [])));
    await pool.query('DELETE FROM sales_history_imports WHERE source_sha256=$1', [source]);
  }
  await pool.query('DELETE FROM hotmart_events WHERE product_ucode=ANY($1::text[])', [codes]);
  await pool.query('DELETE FROM hotmart_purchases WHERE product_ucode=ANY($1::text[])', [codes]);
  await pool.query('DELETE FROM hotmart_product_mappings WHERE product_ucode=ANY($1::text[])', [
    codes,
  ]);
  await pool.query('DELETE FROM "user" WHERE id=ANY($1::text[])', [users]);
  await pool.end();
  await db.$client.end();
});

test('preview is read-only; application creates only valid SLL memberships and is idempotent', async () => {
  const email = `${randomUUID()}@example.invalid`;
  const batch = input([email]);
  expect(await importSalesHistory(pool, batch)).toMatchObject({
    applied: false,
    newAccounts: 1,
    storeGrants: 0,
  });
  expect((await pool.query('SELECT id FROM "user" WHERE email=$1', [email])).rowCount).toBe(0);
  expect(await importSalesHistory(pool, batch, true)).toMatchObject({
    applied: true,
    newMemberships: 1,
  });
  const importedAccount = await db.query.user.findFirst({ where: eq(s.user.email, email) });
  expect(importedAccount).toMatchObject({ mustChangePassword: false, role: 'user' });
  currentUser = importedAccount!.id;
  expect((await getStudentProducts(currentUser)).products).toEqual(['sll']);
  await expect(requireProductAction('sll')).resolves.toHaveProperty('userId', currentUser);
  await expect(requireProductAction('loja-pronta')).rejects.toThrow('redirect:/');
  expect(await importSalesHistory(pool, batch, true)).toEqual({ alreadyImported: true });
  await pool.query('UPDATE historical_sll_purchases SET expires_at=now() WHERE source_sha256=$1', [
    batch.sourceSha256,
  ]);
  expect((await getStudentProducts(currentUser)).products).toEqual([]);
  await expect(requireProductAction('sll')).rejects.toThrow('redirect:/');
  expect(
    (await pool.query('SELECT 1 FROM student_products WHERE user_id=$1', [currentUser])).rowCount,
  ).toBe(1);
});

test('expired purchases create no accounts; roles, bans, revocations and existing credentials are preserved', async () => {
  const normal = await account(),
    banned = await account({ banned: true }),
    admin = await account({ role: 'admin' }),
    revoked = await account();
  await db.insert(s.account).values({
    id: randomUUID(),
    accountId: normal.id,
    providerId: 'credential',
    userId: normal.id,
    password: 'unchanged-personal-hash',
    updatedAt: new Date(),
  });
  await db.insert(s.manualProductGrants).values({ userId: normal.id, product: 'loja-pronta' });
  await db.insert(s.studentProducts).values({ userId: normal.id, product: 'loja-pronta' });
  await db.insert(s.productAccessEvents).values({
    id: randomUUID(),
    targetUserId: revoked.id,
    product: 'sll',
    action: 'revoked',
    reason: 'Existing decision',
  });
  const expiredEmail = `${randomUUID()}@example.invalid`;
  const expired = input([expiredEmail], 500);
  expect(await importSalesHistory(pool, expired, true)).toMatchObject({
    newAccounts: 0,
    newMemberships: 0,
  });
  expect((await pool.query('SELECT id FROM "user" WHERE email=$1', [expiredEmail])).rowCount).toBe(
    0,
  );
  const batch = input([normal.email, banned.email, admin.email, revoked.email]);
  expect(await importSalesHistory(pool, batch, true)).toMatchObject({
    newAccounts: 0,
    eligible_emails: 1,
  });
  expect((await getStudentProducts(normal.id)).products).toEqual(['sll', 'loja-pronta']);
  for (const id of [banned.id, admin.id, revoked.id])
    expect((await getStudentProducts(id)).products).toEqual([]);
  expect(
    (await db.query.account.findFirst({ where: eq(s.account.userId, normal.id) }))!.password,
  ).toBe('unchanged-personal-hash');
});

test('historical refunds revoke only SLL; later approvals and repeated imports cannot restore it', async () => {
  const a = await account(),
    batch = input([a.email]),
    p = batch.purchases[0]!;
  const code = randomUUID();
  codes.push(code);
  await importSalesHistory(pool, batch, true);
  await db.insert(s.manualProductGrants).values({ userId: a.id, product: 'loja-pronta' });
  await db.insert(s.studentProducts).values({ userId: a.id, product: 'loja-pronta' });
  await processHotmartEvent(notification(a.email, p.transaction, code, 'PURCHASE_REFUNDED'));
  expect((await getStudentProducts(a.id)).products).toEqual(['loja-pronta']);
  await processHotmartEvent(
    notification(a.email, p.transaction, code, 'PURCHASE_COMPLETE', Date.now() - 1000),
  );
  await importSalesHistory(pool, batch, true);
  expect((await getStudentProducts(a.id)).products).toEqual(['loja-pronta']);
});

test('webhook terms use original purchase dates and cannot be extended by completion events', async () => {
  const a = await account(),
    code = randomUUID(),
    transaction = randomUUID();
  codes.push(code);
  await db.insert(s.hotmartProductMappings).values({ productUcode: code, access: 'sll' });
  const original = Date.now() - 100 * 86400000;
  await processHotmartEvent(
    notification(a.email, transaction, code, 'PURCHASE_APPROVED', original),
  );
  expect((await getStudentProducts(a.id)).products).toEqual(['sll']);
  await processHotmartEvent(
    notification(a.email, transaction, code, 'PURCHASE_COMPLETE', Date.now() - 1000),
  );
  const p = await db.query.hotmartPurchases.findFirst({
    where: eq(s.hotmartPurchases.transaction, transaction),
  });
  expect(p!.purchasedAt!.getTime()).toBe(original);
  expect(p!.expiresAt).toEqual(purchaseExpiresAt(new Date(original)));
  const missing = notification(a.email, randomUUID(), code, 'PURCHASE_APPROVED');
  expect(await processHotmartEvent(missing)).toBe('Compra sem data original; acesso não liberado.');
  missing.data.purchase.order_date = original;
  expect(await processHotmartEvent(missing)).toBe('Compra aprovada; acesso liberado.');
  await pool.query('UPDATE hotmart_purchases SET expires_at=now() WHERE user_id=$1', [a.id]);
  expect((await getStudentProducts(a.id)).products).toEqual([]);
});
