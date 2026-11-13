import { afterAll, afterEach, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { auth } from '@/server/auth/auth';
import * as emailDelivery from '@/server/auth/emails';
import { db } from '@/server/db';
import {
  account,
  hotmartEvents,
  hotmartFirstAccessEmails,
  hotmartProductMappings,
  hotmartPurchases,
  studentProducts,
  user,
  verification,
} from '@/server/db/schema';
import type { HotmartPurchaseEvent } from '@/features/hotmart/event';
import { rejection } from '../support/rejection';

const send = mock(async (_message: { to: string; url: string }) => {});
mock.module('@/server/auth/emails', () => ({ ...emailDelivery, sendFirstPasswordEmail: send }));
mock.module('next/cache', () => ({ revalidateTag: () => {} }));
const { processHotmartEvent } = await import('@/features/hotmart/server/process-event');
const { processHotmartFirstAccessEmail } =
  await import('@/features/hotmart/server/first-access-email');

const code = randomUUID();
const emails: string[] = [];

function purchase(email = `${randomUUID()}@example.invalid`): HotmartPurchaseEvent {
  emails.push(email);
  return {
    id: randomUUID(),
    event: 'PURCHASE_APPROVED',
    creation_date: Date.now(),
    version: '2.0.0',
    data: {
      buyer: { email, name: 'New Student' },
      product: { ucode: code },
      purchase: { transaction: randomUUID(), order_date: Date.now() - 1000 },
    },
  };
}

function buyer(email: string) {
  return db.query.user.findFirst({ where: eq(user.email, email) });
}

afterEach(async () => {
  const buyers = await db.select({ id: user.id }).from(user).where(inArray(user.email, emails));
  await db.delete(verification).where(
    inArray(
      verification.value,
      buyers.map(({ id }) => id),
    ),
  );
  await db.delete(hotmartEvents).where(eq(hotmartEvents.productUcode, code));
  await db.delete(hotmartPurchases).where(eq(hotmartPurchases.productUcode, code));
  await db.delete(hotmartProductMappings).where(eq(hotmartProductMappings.productUcode, code));
  await db.delete(user).where(inArray(user.email, emails));
  emails.length = 0;
  send.mockClear();
});

afterAll(async () => {
  await db.$client.end();
});

async function mapCourse() {
  await db
    .insert(hotmartProductMappings)
    .values({ productUcode: code, access: 'sll', primary: false });
}

test('parallel approvals send one invitation and its link can create a working personal password once', async () => {
  await mapCourse();
  const approved = purchase();
  const { email } = approved.data.buyer;
  await Promise.all([processHotmartEvent(approved), processHotmartEvent(purchase(email))]);
  await processHotmartEvent(approved);
  const student = (await buyer(email))!;
  expect(student).toMatchObject({
    email,
    role: 'user',
    mustChangePassword: false,
    emailVerified: true,
  });
  expect(
    await db.query.account.findFirst({ where: eq(account.userId, student.id) }),
  ).toBeUndefined();
  expect(
    await db.query.studentProducts.findMany({ where: eq(studentProducts.userId, student.id) }),
  ).toMatchObject([{ product: 'sll' }]);

  await Promise.all([processHotmartFirstAccessEmail(), processHotmartFirstAccessEmail()]);
  expect(send).toHaveBeenCalledTimes(1);
  const [message] = send.mock.calls[0]!;
  expect(message.to).toBe(email);
  const callback = await auth.handler(new Request(message.url));
  const url = new URL(callback.headers.get('location')!);
  expect(url.pathname).toBe('/redefinir-senha');
  const token = url.searchParams.get('token')!;
  expect(token).toBeTruthy();
  const password = 'My-new-personal-password!';
  await auth.api.resetPassword({ body: { token, newPassword: password } });
  await rejection(auth.api.resetPassword({ body: { token, newPassword: password } }));
  expect((await auth.api.signInEmail({ body: { email, password } })).user.id).toBe(student.id);

  await processHotmartEvent(purchase(email));
  await processHotmartFirstAccessEmail();
  expect(send).toHaveBeenCalledTimes(1);
  expect((await auth.api.signInEmail({ body: { email, password } })).user.id).toBe(student.id);
});

test('an unsuccessful send leaves access active and retries with the exact same link', async () => {
  await mapCourse();
  const approved = purchase();
  await processHotmartEvent(approved);
  const student = (await buyer(approved.data.buyer.email))!;
  send.mockRejectedValueOnce(new Error('Provider unavailable'));
  await processHotmartFirstAccessEmail();
  await processHotmartFirstAccessEmail();
  expect(send).toHaveBeenCalledTimes(1);
  expect(
    await db.query.studentProducts.findMany({ where: eq(studentProducts.userId, student.id) }),
  ).toMatchObject([{ product: 'sll' }]);

  await db
    .update(hotmartFirstAccessEmails)
    .set({ nextAttemptAt: new Date(0) })
    .where(eq(hotmartFirstAccessEmails.userId, student.id));
  await processHotmartFirstAccessEmail();
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[0]).toEqual(send.mock.calls[1]);
  expect(
    await db.query.hotmartFirstAccessEmails.findFirst({
      where: eq(hotmartFirstAccessEmails.userId, student.id),
    }),
  ).toBeUndefined();
});

test('a refund before processing cancels the invitation when it removes all access', async () => {
  await mapCourse();
  const approved = purchase();
  await processHotmartEvent(approved);
  await processHotmartEvent({ ...approved, id: randomUUID(), event: 'PURCHASE_REFUNDED' });
  await processHotmartFirstAccessEmail();
  expect(send).not.toHaveBeenCalled();
  const student = (await buyer(approved.data.buyer.email))!;
  expect(
    await db.query.hotmartFirstAccessEmails.findFirst({
      where: eq(hotmartFirstAccessEmails.userId, student.id),
    }),
  ).toBeUndefined();
});

test('a refund deactivates a recorded purchase while its product is unconfigured', async () => {
  const approved = purchase();
  const transaction = approved.data.purchase.transaction;
  const purchasedAt = new Date(approved.creation_date - 1000);
  await db.insert(hotmartPurchases).values({
    transaction,
    buyerEmail: approved.data.buyer.email,
    productUcode: code,
    active: true,
    purchasedAt,
    expiresAt: new Date(approved.creation_date + 86_400_000),
    lastEventAt: new Date(approved.creation_date),
  });

  expect(
    await processHotmartEvent({
      ...approved,
      id: randomUUID(),
      event: 'PURCHASE_REFUNDED',
      creation_date: approved.creation_date + 1000,
    }),
  ).toBe('Reembolso recebido; acesso recalculado.');
  expect(
    await db.query.hotmartPurchases.findFirst({
      where: eq(hotmartPurchases.transaction, transaction),
    }),
  ).toMatchObject({ active: false, purchasedAt });
});
