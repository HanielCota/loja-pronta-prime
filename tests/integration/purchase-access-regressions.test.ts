import { afterAll, beforeAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import * as s from '@/server/db/schema';
import { publicationPayloadSchema, DAY_MS } from '@/features/assistant/model';
mock.module('next/cache', () => ({
  refresh: () => {},
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (f: unknown) => f,
}));
mock.module('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found');
  },
  unstable_rethrow: () => {},
  redirect: (p: string) => {
    throw new Error(`redirect:${p}`);
  },
}));
const adminId = randomUUID();
mock.module('@/features/admin/server/access', () => ({
  requireAdmin: async () => ({ user: { id: adminId } }),
  requireStaff: async () => ({ user: { id: adminId, role: 'admin' }, staff: 'admin' as const }),
}));
const { processHotmartEvent } = await import('@/features/hotmart/server/process-event');
const { changeStudentProductAccess } = await import('@/features/admin/server/actions');
const { saveExpertOffer } = await import('@/features/sll/server/experience-actions');
const { getStudentExperience } = await import('@/features/sll/server/experience');
const { evaluatePublicationBatch } = await import('@/features/assistant/server/operations');
const users = [adminId];
const codes: string[] = [];
async function account() {
  const id = randomUUID();
  users.push(id);
  await db.insert(s.user).values({
    id,
    name: 'Logic review',
    email: `${id}@example.invalid`,
    mustChangePassword: false,
  });
  return id;
}
function event(id: string, code: string, transaction: string, kind = 'PURCHASE_APPROVED') {
  return {
    id: randomUUID(),
    version: '2.0.0',
    creation_date: Date.now() + 1000,
    event: kind,
    data: {
      buyer: { email: `${id}@example.invalid` },
      product: { ucode: code },
      purchase: { transaction, order_date: Date.now() - 1000 },
    },
  };
}
afterAll(async () => {
  await db.delete(s.hotmartEvents).where(inArray(s.hotmartEvents.productUcode, codes));
  await db.delete(s.hotmartPurchases).where(inArray(s.hotmartPurchases.productUcode, codes));
  await db
    .delete(s.hotmartProductMappings)
    .where(inArray(s.hotmartProductMappings.productUcode, codes));
  await db.delete(s.user).where(inArray(s.user.id, users));
  await db.$client.end();
});
beforeAll(async () => {
  await db
    .insert(s.user)
    .values({ id: adminId, name: 'Admin', email: `${adminId}@example.invalid` });
});
test('revoking SLL preserves the paid bundle and its Loja Pronta access', async () => {
  const id = await account(),
    bundle = randomUUID(),
    store = randomUUID();
  codes.push(bundle, store);
  await db.insert(s.hotmartProductMappings).values([
    { productUcode: bundle, access: 'sll' },
    { productUcode: bundle, access: 'loja-pronta' },
    { productUcode: store, access: 'loja-pronta' },
  ]);
  const bundleTx = randomUUID(),
    storeTx = randomUUID();
  await processHotmartEvent(event(id, bundle, bundleTx));
  await processHotmartEvent(event(id, store, storeTx));
  const form = new FormData();
  for (const [key, value] of Object.entries({
    email: `${id}@example.invalid`,
    product: 'sll',
    action: 'revoked',
    reason: 'Remove only SLL',
  }))
    form.set(key, value);
  expect((await changeStudentProductAccess({ saved: false, message: '' }, form)).saved).toBe(true);
  expect(
    (
      await db.select().from(s.hotmartPurchases).where(eq(s.hotmartPurchases.transaction, bundleTx))
    )[0]!.active,
  ).toBe(true);
  await processHotmartEvent(event(id, store, storeTx, 'PURCHASE_REFUNDED'));
  const access = await db.select().from(s.studentProducts).where(eq(s.studentProducts.userId, id));
  expect(access.map((row) => row.product)).toEqual(['loja-pronta']);
  await processHotmartEvent(event(id, bundle, bundleTx, 'PURCHASE_COMPLETE'));
  expect(
    (await db.select().from(s.studentProducts).where(eq(s.studentProducts.userId, id))).map(
      (row) => row.product,
    ),
  ).toEqual(['loja-pronta']);
  const newPurchase = event(id, bundle, randomUUID());
  await processHotmartEvent(newPurchase);
  expect(
    (await db.select().from(s.studentProducts).where(eq(s.studentProducts.userId, id)))
      .map((row) => row.product)
      .toSorted(),
  ).toEqual(['loja-pronta', 'sll']);
  await processHotmartEvent(event(id, bundle, bundleTx, 'PURCHASE_REFUNDED'));
  expect(
    (await db.select().from(s.studentProducts).where(eq(s.studentProducts.userId, id)))
      .map((row) => row.product)
      .toSorted(),
  ).toEqual(['loja-pronta', 'sll']);
});
test('adding an access to an existing offer reconciles previous buyers without replay', async () => {
  const id = await account(),
    code = randomUUID();
  codes.push(code);
  await db
    .insert(s.hotmartProductMappings)
    .values({ productUcode: code, access: 'sll', primary: false });
  const approved = event(id, code, randomUUID());
  await processHotmartEvent(approved);
  const refundedId = await account();
  const refunded = event(refundedId, code, randomUUID());
  await processHotmartEvent(refunded);
  await processHotmartEvent(
    event(refundedId, code, refunded.data.purchase.transaction, 'PURCHASE_REFUNDED'),
  );
  const form = new FormData();
  form.set('code', code);
  form.set('expert', 'pri');
  form.set('access', 'loja-pronta');
  await expect(saveExpertOffer(form)).rejects.toThrow('resultado=saved');
  const reconciled = await db
    .select()
    .from(s.studentProducts)
    .where(eq(s.studentProducts.userId, id));
  expect(reconciled.map((row) => row.product).toSorted()).toEqual(['loja-pronta', 'sll']);
  expect(
    await db.select().from(s.studentProducts).where(eq(s.studentProducts.userId, refundedId)),
  ).toHaveLength(0);
  await processHotmartEvent(approved);
  const access = await db.select().from(s.studentProducts).where(eq(s.studentProducts.userId, id));
  expect(access.map((r) => r.product).toSorted()).toEqual(['loja-pronta', 'sll']);
});
test('an incomplete collection restarts the observation and valid later days unlock expansion', async () => {
  const id = await account(),
    shopId = 998877,
    app = 'live:123',
    start = Date.now() - 20 * DAY_MS;
  await db.insert(s.shopeeConnections).values({
    userId: id,
    shopId,
    applicationId: app,
    accessTokenEncrypted: 'local',
    refreshTokenEncrypted: 'local',
    accessTokenExpiresAt: new Date(Date.now() + 3600000),
  });
  const [batch] = await db
    .insert(s.assistantPublicationBatches)
    .values({
      userId: id,
      shopId,
      applicationId: app,
      strategy: 'varied',
      status: 'observing',
      publishedAt: new Date(start),
    })
    .returning();
  for (let i = 0; i < 5; i++)
    await db.insert(s.assistantPublicationItems).values({
      batchId: batch!.id,
      userId: id,
      shopId,
      applicationId: app,
      supplierId: 'review',
      sku: `review-${i}`,
      payload: publicationPayloadSchema.parse({
        item_name: `Product ${i}`,
        description: 'Reviewed item',
        category_id: 10 + i,
        item_sku: `review-${i}`,
        original_price: 20,
        normal_stock: 2,
        weight: 0.2,
        brand: { brand_id: 0, original_brand_name: 'NoBrand' },
        condition: 'NEW',
        item_status: 'NORMAL',
        image: { image_id_list: ['image-id'] },
        dimension: { package_length: 10, package_width: 10, package_height: 10 },
        logistic_info: [{ logistic_id: 1, enabled: true, is_free: false }],
      }),
      status: 'published',
      itemId: 100 + i,
      publishedAt: new Date(start),
    });
  let baselineId: string | undefined;
  let latestId: string | undefined;
  for (const day of [0, 1, 2, 6, 8]) {
    const [run] = await db
      .insert(s.shopeeCollectionRuns)
      .values({
        userId: id,
        shopId,
        applicationId: app,
        status: 'completed',
        startedAt: new Date(start + day * 86400000),
        completedAt: new Date(start + day * 86400000),
      })
      .returning();
    if (day === 2) baselineId = run!.id;
    latestId = run!.id;
    for (let i = 0; i < 5; i++) {
      if (day === 1 && i === 0) continue;
      await db.insert(s.shopeeMetricSnapshots).values({
        runId: run!.id,
        itemId: 100 + i,
        title: `Product ${i}`,
        categoryId: 10 + i,
        views: day * 100 + i,
        sales: day,
      });
    }
    if (day === 6) {
      expect((await evaluatePublicationBatch(id, batch!.id))!.status).toBe('insufficient');
    }
  }
  const analysis = await evaluatePublicationBatch(id, batch!.id);
  expect(analysis!.status).toBe('ready');
  expect(analysis!.runIds).toEqual([baselineId!, latestId!]);
  const [saved] = await db
    .select()
    .from(s.assistantPublicationBatches)
    .where(eq(s.assistantPublicationBatches.id, batch!.id));
  expect(saved!.status).toBe('evaluated');
});

test('offer reconciliation respects area exclusions and manual grants survive refunds', async () => {
  const id = await account(),
    code = randomUUID(),
    transaction = randomUUID();
  codes.push(code);
  await db.insert(s.hotmartProductMappings).values([
    { productUcode: code, access: 'sll', expert: 'ze', primary: false },
    { productUcode: code, access: 'loja-pronta', expert: 'ze', primary: false },
  ]);
  await processHotmartEvent(event(id, code, transaction));
  expect((await getStudentExperience(id)).allowed).toEqual(['ze']);
  const accessForm = new FormData();
  for (const [key, value] of Object.entries({
    email: `${id}@example.invalid`,
    product: 'sll',
    action: 'revoked',
    reason: 'Remove only SLL',
  }))
    accessForm.set(key, value);
  await changeStudentProductAccess({ saved: false, message: '' }, accessForm);
  const offerForm = new FormData();
  offerForm.set('code', code);
  offerForm.set('access', 'sll');
  offerForm.set('expert', 'ze');
  await expect(saveExpertOffer(offerForm)).rejects.toThrow('resultado=saved');
  expect(
    (await db.select().from(s.studentProducts).where(eq(s.studentProducts.userId, id))).map(
      (row) => row.product,
    ),
  ).toEqual(['loja-pronta']);
  expect((await getStudentExperience(id)).allowed).not.toContain('ze');
  accessForm.set('action', 'granted');
  await changeStudentProductAccess({ saved: false, message: '' }, accessForm);
  await processHotmartEvent(event(id, code, transaction, 'PURCHASE_REFUNDED'));
  expect(
    (await db.select().from(s.studentProducts).where(eq(s.studentProducts.userId, id))).map(
      (row) => row.product,
    ),
  ).toEqual(['sll']);
});
