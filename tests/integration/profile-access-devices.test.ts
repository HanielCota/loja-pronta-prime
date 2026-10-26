import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import * as s from '@/server/db/schema';
import { getAccessValidity } from '@/features/products/server/access-validity';
import { getAccountDevices } from '@/features/auth/server/devices';

const DAY_MS = 24 * 60 * 60 * 1000;
const users: string[] = [];
const codes: string[] = [];
const sources: string[] = [];

async function account() {
  const id = randomUUID();
  users.push(id);
  await db.insert(s.user).values({
    id,
    name: 'Profile review',
    email: `${id}@example.invalid`,
    mustChangePassword: false,
  });
  return id;
}

function purchase(userId: string, productUcode: string, expiresInDays: number, active = true) {
  return {
    transaction: randomUUID(),
    buyerEmail: `${userId}@example.invalid`,
    productUcode,
    userId,
    active,
    purchasedAt: new Date(Date.now() - DAY_MS),
    expiresAt: new Date(Date.now() + expiresInDays * DAY_MS),
    lastEventAt: new Date(),
  };
}

afterAll(async () => {
  await db.delete(s.hotmartPurchases).where(inArray(s.hotmartPurchases.productUcode, codes));
  await db
    .delete(s.hotmartProductMappings)
    .where(inArray(s.hotmartProductMappings.productUcode, codes));
  await db.delete(s.historicalSllPurchases).where(inArray(s.historicalSllPurchases.userId, users));
  await db
    .delete(s.salesHistoryImports)
    .where(inArray(s.salesHistoryImports.sourceSha256, sources));
  await db.delete(s.user).where(inArray(s.user.id, users));
  await db.$client.end();
});

test('access validity follows the same purchases that open the area', async () => {
  const id = await account();
  const store = randomUUID();
  const course = randomUUID();
  codes.push(store, course);
  await db.insert(s.hotmartProductMappings).values([
    { productUcode: store, access: 'loja-pronta' },
    { productUcode: course, access: 'sll' },
  ]);
  const longest = purchase(id, store, 200);
  const revoked = purchase(id, course, 300);
  await db
    .insert(s.hotmartPurchases)
    .values([
      purchase(id, store, 20),
      longest,
      purchase(id, store, 500, false),
      { ...purchase(id, store, 600), expiresAt: new Date(Date.now() - DAY_MS) },
      revoked,
    ]);
  await db
    .insert(s.hotmartPurchaseAccessRevocations)
    .values({ transaction: revoked.transaction, product: 'sll' });

  const source = randomUUID();
  sources.push(source);
  await db.insert(s.salesHistoryImports).values({ sourceSha256: source, preparedSha256: source });
  const historicalExpiry = new Date(Date.now() + 40 * DAY_MS);
  await db.insert(s.historicalSllPurchases).values({
    transaction: randomUUID(),
    sourceSha256: source,
    sourceProductId: '123',
    buyerEmail: `${id}@example.invalid`,
    userId: id,
    purchasedAt: new Date(Date.now() - DAY_MS),
    expiresAt: historicalExpiry,
  });

  const { byProduct } = await getAccessValidity(id);
  // A mais longa das ativas; inativa, vencida e revogada ficam de fora.
  expect(byProduct['loja-pronta']).toEqual({ kind: 'until', expiresAt: longest.expiresAt });
  expect(byProduct.sll).toEqual({ kind: 'until', expiresAt: historicalExpiry });

  // A liberação manual vale mais que qualquer data.
  await db.insert(s.manualProductGrants).values({ userId: id, product: 'sll' });
  expect((await getAccessValidity(id)).byProduct.sll).toEqual({ kind: 'no-end' });
});

test('devices list open sessions, current first, without impersonation', async () => {
  const id = await account();
  const session = (createdAgoDays: number, extra: Partial<typeof s.session.$inferInsert> = {}) => ({
    id: randomUUID(),
    token: randomUUID(),
    userId: id,
    createdAt: new Date(Date.now() - createdAgoDays * DAY_MS),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + DAY_MS),
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
    ...extra,
  });
  const current = session(5);
  const recent = session(1);
  await db
    .insert(s.session)
    .values([
      current,
      recent,
      session(0, { expiresAt: new Date(Date.now() - 1000) }),
      session(0, { impersonatedBy: randomUUID() }),
    ]);

  const devices = await getAccountDevices(id, current.id);
  expect(devices.map((device) => [device.id, device.current])).toEqual([
    [current.id, true],
    [recent.id, false],
  ]);
  expect(devices[0]!.kindLabel).toBe('Computador');
});
