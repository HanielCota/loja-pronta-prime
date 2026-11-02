import { afterAll, beforeAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  user,
  hotmartEvents,
  hotmartPurchases,
  hotmartProductMappings,
  studentProducts,
  studentExperiences,
} from '@/server/db/schema';
import { getStudentExperience } from '@/features/sll/server/experience';

mock.module('next/cache', () => ({ revalidateTag: () => {} }));
const { processHotmartEvent } = await import('@/features/hotmart/server/process-event');
const userId = randomUUID(),
  otherId = randomUUID();
const priCode = randomUUID(),
  zeCode = randomUUID();
const accountIds = [userId, otherId];
beforeAll(async () => {
  for (const id of [userId, otherId])
    await db.insert(user).values({
      id,
      name: 'Compradora',
      email: `${id}@example.invalid`,
      mustChangePassword: false,
    });
  await db.insert(hotmartProductMappings).values([
    { productUcode: priCode, access: 'sll', expert: 'pri', primary: false },
    { productUcode: zeCode, access: 'sll', expert: 'ze', primary: false },
  ]);
});
afterAll(async () => {
  await db.delete(hotmartEvents).where(inArray(hotmartEvents.productUcode, [priCode, zeCode]));
  await db
    .delete(hotmartPurchases)
    .where(inArray(hotmartPurchases.productUcode, [priCode, zeCode]));
  await db
    .delete(hotmartProductMappings)
    .where(inArray(hotmartProductMappings.productUcode, [priCode, zeCode]));
  for (const id of accountIds) await db.delete(user).where(eq(user.id, id));
  await db.$client.end();
});
const purchase = (
  code: string,
  transaction: string,
  id = userId,
  event = 'PURCHASE_APPROVED',
  time = Date.now(),
) => ({
  id: randomUUID(),
  version: '2.0.0',
  creation_date: time,
  event,
  data: {
    buyer: { email: `${id}@example.invalid` },
    product: { ucode: code },
    purchase: { transaction, order_date: Date.now() - 1000 },
  },
});

test('a compra grava o expert e o reembolso remove somente aquela experiência', async () => {
  const zeTransaction = randomUUID();
  const priTransaction = randomUUID();
  await processHotmartEvent(purchase(zeCode, zeTransaction));
  expect(await getStudentExperience(userId)).toEqual({ expert: 'ze', allowed: ['ze'] });
  expect(
    (
      await db
        .select()
        .from(hotmartPurchases)
        .where(eq(hotmartPurchases.transaction, zeTransaction))
    )[0]?.expert,
  ).toBe('ze');
  await processHotmartEvent(purchase(priCode, priTransaction));
  expect((await getStudentExperience(userId)).allowed).toEqual(['ze', 'pri']);
  await db.insert(studentExperiences).values({ userId, expert: 'ze' });
  await processHotmartEvent(
    purchase(zeCode, zeTransaction, userId, 'PURCHASE_REFUNDED', Date.now() + 1000),
  );
  expect(await getStudentExperience(userId)).toEqual({ expert: 'pri', allowed: ['pri'] });
  expect(
    await db
      .select()
      .from(studentProducts)
      .where(and(eq(studentProducts.userId, userId), eq(studentProducts.product, 'sll'))),
  ).toHaveLength(1);
  expect(await getStudentExperience(otherId)).toEqual({ expert: 'pri', allowed: ['pri'] });
});

test('a repetição da compra preserva a origem já registrada', async () => {
  const transaction = randomUUID();
  const approved = purchase(zeCode, transaction, otherId);
  await processHotmartEvent(approved);
  await processHotmartEvent(approved);
  // Mesmo uma edição indevida no banco não reescreve a origem histórica da compra.
  await db
    .update(hotmartProductMappings)
    .set({ expert: 'pri' })
    .where(eq(hotmartProductMappings.productUcode, zeCode));
  await processHotmartEvent(
    purchase(zeCode, transaction, otherId, 'PURCHASE_COMPLETE', Date.now() + 1000),
  );
  expect(
    (
      await db.select().from(hotmartPurchases).where(eq(hotmartPurchases.transaction, transaction))
    )[0]?.expert,
  ).toBe('ze');
  expect((await getStudentExperience(otherId)).expert).toBe('ze');
});

test.each([false, true])(
  'purchase events preserve ownership after a platform email change (old email reused: %s)',
  async (reused) => {
    const originalId = randomUUID();
    accountIds.push(originalId);
    const originalEmail = `${originalId}@example.invalid`;
    await db.insert(user).values({
      id: originalId,
      name: 'Original buyer',
      email: originalEmail,
      mustChangePassword: false,
    });
    const transaction = randomUUID();
    const approved = purchase(priCode, transaction, originalId);
    await processHotmartEvent(approved);
    await db
      .update(user)
      .set({ email: `${originalId}-updated@example.invalid` })
      .where(eq(user.id, originalId));
    const replacementId = randomUUID();
    if (reused) {
      accountIds.push(replacementId);
      await db.insert(user).values({
        id: replacementId,
        name: 'Different buyer',
        email: originalEmail,
        mustChangePassword: false,
      });
    }
    await processHotmartEvent({
      ...approved,
      id: randomUUID(),
      event: 'PURCHASE_COMPLETE',
      creation_date: approved.creation_date + 1000,
    });
    const [saved] = await db
      .select()
      .from(hotmartPurchases)
      .where(eq(hotmartPurchases.transaction, transaction));
    expect(saved?.userId).toBe(originalId);
    const accountAtOldEmail = await db.query.user.findFirst({
      columns: { id: true },
      where: eq(user.email, originalEmail),
    });
    expect(accountAtOldEmail?.id).toBe(reused ? replacementId : undefined);
    expect(
      await db.select().from(studentProducts).where(eq(studentProducts.userId, replacementId)),
    ).toHaveLength(0);
    await processHotmartEvent({
      ...approved,
      id: randomUUID(),
      event: 'PURCHASE_REFUNDED',
      creation_date: approved.creation_date + 2000,
    });
    expect(
      await db.select().from(studentProducts).where(eq(studentProducts.userId, originalId)),
    ).toHaveLength(0);
    expect(
      (
        await db
          .select()
          .from(hotmartPurchases)
          .where(eq(hotmartPurchases.transaction, transaction))
      )[0]?.userId,
    ).toBe(originalId);
  },
);
