import { afterAll, beforeAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  hotmartEvents,
  hotmartProductIds,
  hotmartProductMappings,
  hotmartPurchases,
  studentProducts,
  user,
} from '@/server/db/schema';
import { productIdentityConflict } from '@/features/hotmart/server/product-identity';
import { getStudentExperience } from '@/features/sll/server/experience';

mock.module('next/cache', () => ({ revalidateTag: () => {} }));
const { processHotmartEvent } = await import('@/features/hotmart/server/process-event');
const codes = Array.from({ length: 7 }, () => randomUUID());
const buyers = Array.from({ length: 7 }, () => randomUUID());
const numericIds = [8781486, 8781449, 98781486, 98781487];

beforeAll(async () => {
  for (const id of buyers)
    await db.insert(user).values({
      id,
      name: 'Numeric Product Buyer',
      email: `${id}@example.invalid`,
      mustChangePassword: false,
    });
  await db
    .insert(hotmartProductIds)
    .values({ productId: numericIds[2]!, access: 'sll', expert: 'ze' });
});

afterAll(async () => {
  await db.delete(hotmartEvents).where(inArray(hotmartEvents.productUcode, codes));
  await db.delete(hotmartPurchases).where(inArray(hotmartPurchases.productUcode, codes));
  await db
    .delete(hotmartProductMappings)
    .where(inArray(hotmartProductMappings.productUcode, codes));
  await db
    .update(hotmartProductIds)
    .set({ productUcode: null })
    .where(inArray(hotmartProductIds.productId, numericIds));
  await db
    .delete(hotmartProductIds)
    .where(inArray(hotmartProductIds.productId, numericIds.slice(2)));
  await db.delete(user).where(inArray(user.id, buyers));
  await db.$client.end();
});

function purchase(index: number, productId?: number, ucode = codes[index]!) {
  return {
    id: randomUUID(),
    version: '2.0.0',
    creation_date: Date.now(),
    event: 'PURCHASE_APPROVED',
    data: {
      buyer: { email: `${buyers[index]}@example.invalid` },
      product: { ucode, id: productId },
      purchase: { transaction: randomUUID(), order_date: Date.now() - 1000 },
    },
  };
}

test('an unconfigured event can be retried after its numeric ID is configured', async () => {
  const event = purchase(5, numericIds[3]);
  expect(await processHotmartEvent(event)).toBe('Produto sem acesso configurado.');
  expect(
    await db.query.hotmartPurchases.findFirst({
      where: eq(hotmartPurchases.transaction, event.data.purchase.transaction),
    }),
  ).toBeUndefined();
  await db
    .insert(hotmartProductIds)
    .values({ productId: numericIds[3]!, access: 'sll', expert: 'ze' });
  expect(await processHotmartEvent(event)).toBe('Compra aprovada; acesso liberado.');
  expect(await processHotmartEvent(event)).toBe('Aviso já recebido.');
  expect(
    await db.query.hotmartPurchases.findFirst({
      where: eq(hotmartPurchases.transaction, event.data.purchase.transaction),
    }),
  ).toMatchObject({
    productId: numericIds[3],
    purchasedAt: new Date(event.data.purchase.order_date),
    active: true,
  });
});

test('a numeric match alone never grants access without an original purchase date', async () => {
  const event = purchase(6, numericIds[3], codes[5]);
  const undated = {
    ...event,
    data: { ...event.data, purchase: { transaction: event.data.purchase.transaction } },
  };
  expect(await processHotmartEvent(undated)).toBe('Compra sem data original; acesso não liberado.');
  expect(
    await db.query.studentProducts.findMany({ where: eq(studentProducts.userId, buyers[6]!) }),
  ).toHaveLength(0);
});

test('configured IDs grant the correct product and preserve the Ze experience', async () => {
  for (const [index, productId, access] of [
    [0, 8781486, 'loja-pronta'],
    [1, 8781449, 'sll'],
  ] as const) {
    const event = purchase(index, productId);
    expect(await processHotmartEvent(event)).toBe('Compra aprovada; acesso liberado.');
    expect(await processHotmartEvent(event)).toBe('Aviso já recebido.');
    const recorded = await db.query.hotmartPurchases.findFirst({
      where: eq(hotmartPurchases.transaction, event.data.purchase.transaction),
    });
    expect(recorded).toMatchObject({
      productId,
      productUcode: codes[index],
      expert: 'ze',
      active: true,
    });
    const granted = await db.query.studentProducts.findMany({
      where: eq(studentProducts.userId, buyers[index]!),
    });
    expect(granted.map((row) => row.product)).toEqual([access]);
    expect(
      await db.query.hotmartEvents.findFirst({ where: eq(hotmartEvents.id, event.id) }),
    ).toMatchObject({ productId });
    expect(
      await db.query.hotmartProductMappings.findFirst({
        where: eq(hotmartProductMappings.productUcode, codes[index]!),
      }),
    ).toMatchObject({ access, expert: 'ze', primary: false });
    if (access === 'sll')
      expect(await getStudentExperience(buyers[index]!)).toEqual({ expert: 'ze', allowed: ['ze'] });
    // Older deliveries without the numeric ID still revoke the learned ucode correctly.
    expect(
      await processHotmartEvent({
        ...event,
        id: randomUUID(),
        event: 'PURCHASE_REFUNDED',
        creation_date: event.creation_date + 1000,
        data: { ...event.data, product: { ucode: event.data.product.ucode } },
      }),
    ).toBe('Reembolso recebido; acesso recalculado.');
    expect(
      await db.query.studentProducts.findMany({
        where: eq(studentProducts.userId, buyers[index]!),
      }),
    ).toHaveLength(0);
  }
});

test('refuses conflicting identities without granting or relabeling access', async () => {
  for (const event of [
    purchase(2, 8781486), // A known ID cannot switch ucodes.
    purchase(2, 8781449, codes[0]), // A known ucode cannot switch IDs.
    purchase(2, 123456, codes[0]), // Unknown IDs cannot impersonate a bound ucode.
  ]) {
    expect(await processHotmartEvent(event)).toBe(productIdentityConflict);
    expect(
      await db.query.hotmartPurchases.findFirst({
        where: eq(hotmartPurchases.transaction, event.data.purchase.transaction),
      }),
    ).toBeUndefined();
  }
  expect(
    await db.query.studentProducts.findMany({ where: eq(studentProducts.userId, buyers[2]!) }),
  ).toHaveLength(0);
});

test('does not override an existing ucode access or expert using a numeric mapping', async () => {
  await db
    .insert(hotmartProductMappings)
    .values({ productUcode: codes[3]!, access: 'loja-pronta', expert: 'pri', primary: false });
  const event = purchase(3, numericIds[2]);
  expect(await processHotmartEvent(event)).toBe(productIdentityConflict);
  expect(
    await db.query.hotmartProductIds.findFirst({
      where: eq(hotmartProductIds.productId, numericIds[2]!),
    }),
  ).toMatchObject({ productUcode: null });
  expect(
    await db.query.studentProducts.findMany({ where: eq(studentProducts.userId, buyers[3]!) }),
  ).toHaveLength(0);
});

test('concurrent first deliveries bind once and refund only the matching purchase', async () => {
  const first = purchase(4, numericIds[2]);
  const second = purchase(4, numericIds[2]);
  expect(await Promise.all([processHotmartEvent(first), processHotmartEvent(second)])).toEqual([
    'Compra aprovada; acesso liberado.',
    'Compra aprovada; acesso liberado.',
  ]);
  expect(
    await db.query.hotmartProductMappings.findMany({
      where: eq(hotmartProductMappings.productUcode, codes[4]!),
    }),
  ).toHaveLength(1);
  await processHotmartEvent({
    ...first,
    id: randomUUID(),
    event: 'PURCHASE_CHARGEBACK',
    creation_date: Date.now() + 1000,
  });
  expect(
    await db.query.studentProducts.findMany({
      where: and(eq(studentProducts.userId, buyers[4]!), eq(studentProducts.product, 'sll')),
    }),
  ).toHaveLength(1);
  expect(
    await db.query.hotmartPurchases.findFirst({
      where: eq(hotmartPurchases.transaction, second.data.purchase.transaction),
    }),
  ).toMatchObject({ active: true });
});
