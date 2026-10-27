import { afterAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import * as s from '@/server/db/schema';
import { auth } from '@/server/auth/auth';
import { parseHotmartEvent } from '@/features/hotmart/event';
import { pendingRefundResult } from '@/features/hotmart/recovery';

let authorized = true;
mock.module('@/features/admin/server/access', () => ({
  requireAdmin: async () => {
    if (!authorized) throw new Error('unauthorized');
    return { user: { id: 'admin' } };
  },
}));
mock.module('next/cache', () => ({
  revalidateTag: () => {},
  revalidatePath: () => {},
  refresh: () => {},
}));
mock.module('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
const { processHotmartEvent } = await import('@/features/hotmart/server/process-event');
const { replayPendingHotmartEvents, getHotmartPendingState } =
  await import('@/features/hotmart/server/pending-events');
const { saveExpertOffer } = await import('@/features/sll/server/experience-actions');
const { retryHotmartPendingEvents } = await import('@/features/hotmart/server/actions');
const codes: string[] = [];
const emails: string[] = [];

function purchase() {
  const code = randomUUID();
  const email = `${randomUUID()}@example.invalid`;
  codes.push(code);
  emails.push(email);
  return parseHotmartEvent({
    id: randomUUID(),
    event: 'PURCHASE_APPROVED',
    version: '2.0.0',
    creation_date: Date.now() - 1000,
    data: {
      product: { id: 6102550, ucode: code, name: 'Recovery course' },
      buyer: { email, name: 'Recovered student' },
      purchase: { transaction: randomUUID(), order_date: Date.now() - 86400000 },
    },
  }).data!;
}
async function map(code: string) {
  await db
    .insert(s.hotmartProductMappings)
    .values({ productUcode: code, access: 'sll', expert: 'pri', primary: false });
}
afterAll(async () => {
  await db.delete(s.hotmartEvents).where(inArray(s.hotmartEvents.productUcode, codes));
  await db.delete(s.hotmartPurchases).where(inArray(s.hotmartPurchases.productUcode, codes));
  await db
    .delete(s.hotmartProductMappings)
    .where(inArray(s.hotmartProductMappings.productUcode, codes));
  await db.delete(s.user).where(inArray(s.user.email, emails));
  await db.$client.end();
});

test('configuring a product recovers its retained approval and creates a working account', async () => {
  const event = purchase();
  expect(await processHotmartEvent(event)).toBe('Produto sem acesso configurado.');
  expect(
    await db.query.user.findFirst({ where: eq(s.user.email, event.data.buyer.email) }),
  ).toBeUndefined();
  const pending = await getHotmartPendingState(event.data.buyer.email, 1);
  expect(pending.total).toBe(1);
  expect(pending.events[0]?.configured).toBe(false);
  expect(pending.events[0]?.event).toMatchObject({
    productName: 'Recovery course',
    orderedAt: new Date(event.data.purchase.order_date!),
  });
  const form = new FormData();
  form.set('code', event.data.product.ucode);
  form.set('access', 'sll');
  form.set('expert', 'pri');
  form.set('returnToHotmart', '1');
  await expect(saveExpertOffer(form)).rejects.toThrow(
    'redirect:/admin/hotmart?resultado=configured',
  );
  expect((await getHotmartPendingState(event.data.buyer.email, 1)).total).toBe(0);
  const account = await db.query.user.findFirst({
    where: eq(s.user.email, event.data.buyer.email),
  });
  expect(account).toBeDefined();
  expect(
    await db.query.studentProducts.findMany({ where: eq(s.studentProducts.userId, account!.id) }),
  ).toMatchObject([{ product: 'sll' }]);
  expect(
    await db.query.hotmartPurchases.findFirst({
      where: eq(s.hotmartPurchases.transaction, event.data.purchase.transaction),
    }),
  ).toMatchObject({ purchasedAt: new Date(event.data.purchase.order_date!), active: true });
  const login = await auth.api.signInEmail({
    body: { email: event.data.buyer.email, password: 'loja1234' },
  });
  expect(login.user.id).toBe(account!.id);
});

test('repeated and concurrent recovery preserve existing personal passwords and create one purchase', async () => {
  const event = purchase();
  await auth.api.createUser({
    body: {
      email: event.data.buyer.email,
      password: 'PersonalPassword123!',
      name: 'Existing student',
      role: 'user',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  await processHotmartEvent(event);
  await map(event.data.product.ucode);
  await Promise.all([
    replayPendingHotmartEvents(event.data.product.ucode),
    replayPendingHotmartEvents(event.data.product.ucode),
  ]);
  expect(await replayPendingHotmartEvents(event.data.product.ucode)).toEqual({
    recovered: 0,
    failed: 0,
  });
  expect(
    await db.query.hotmartPurchases.findMany({
      where: eq(s.hotmartPurchases.transaction, event.data.purchase.transaction),
    }),
  ).toHaveLength(1);
  expect(
    (
      await auth.api.signInEmail({
        body: { email: event.data.buyer.email, password: 'PersonalPassword123!' },
      })
    ).user.email,
  ).toBe(event.data.buyer.email);
});

test('an unmapped refund blocks a live approval and recovery never restores the refunded purchase', async () => {
  const event = purchase();
  await processHotmartEvent({
    ...event,
    id: randomUUID(),
    event: 'PURCHASE_REFUNDED',
    creation_date: event.creation_date + 1,
  });
  await map(event.data.product.ucode);
  expect(await processHotmartEvent(event)).toBe(pendingRefundResult);
  await replayPendingHotmartEvents(event.data.product.ucode);
  const recorded = await db.query.hotmartPurchases.findFirst({
    where: eq(s.hotmartPurchases.transaction, event.data.purchase.transaction),
  });
  expect(recorded?.active).toBe(false);
  if (recorded?.userId)
    expect(
      await db.query.studentProducts.findMany({
        where: eq(s.studentProducts.userId, recorded.userId),
      }),
    ).toHaveLength(0);
});

test('unknown products, undated approvals and legacy events stay pending without synthetic dates', async () => {
  const unknown = purchase();
  await processHotmartEvent(unknown);
  expect(await replayPendingHotmartEvents(unknown.data.product.ucode)).toEqual({
    recovered: 0,
    failed: 0,
  });
  const undated = purchase();
  await processHotmartEvent({
    ...undated,
    data: { ...undated.data, purchase: { transaction: undated.data.purchase.transaction } },
  });
  await map(undated.data.product.ucode);
  expect(await replayPendingHotmartEvents(undated.data.product.ucode)).toEqual({
    recovered: 0,
    failed: 0,
  });
  const legacy = purchase();
  await map(legacy.data.product.ucode);
  await db.insert(s.hotmartEvents).values({
    id: legacy.id,
    event: legacy.event,
    transaction: legacy.data.purchase.transaction,
    buyerEmail: legacy.data.buyer.email,
    productUcode: legacy.data.product.ucode,
    productId: 6102550,
    result: 'Produto sem acesso configurado.',
  });
  expect(await replayPendingHotmartEvents(legacy.data.product.ucode)).toEqual({
    recovered: 0,
    failed: 0,
  });
  expect(
    await db.query.user.findFirst({ where: eq(s.user.email, legacy.data.buyer.email) }),
  ).toBeUndefined();
});

test('pending search includes older records, numeric IDs and literal wildcard characters', async () => {
  const event = purchase();
  await processHotmartEvent(event);
  expect((await getHotmartPendingState('6102550', 1)).total).toBeGreaterThan(0);
  expect((await getHotmartPendingState('%', 1)).total).toBe(0);
  expect((await getHotmartPendingState(event.data.buyer.email, 1)).events[0]?.event.id).toBe(
    event.id,
  );
});

test('recovery and pending buyer data require administrative access', async () => {
  authorized = false;
  try {
    await expect(retryHotmartPendingEvents()).rejects.toThrow('unauthorized');
    await expect(getHotmartPendingState('', 1)).rejects.toThrow('unauthorized');
  } finally {
    authorized = true;
  }
});
