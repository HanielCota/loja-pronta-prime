import { beforeEach, expect, mock, test } from 'bun:test';
import type { HotmartPurchaseEvent } from '@/features/hotmart/event';

let existingBuyer: { id: string } | undefined;
let duplicate = false;
const createUser = mock(async () => ({ user: { id: 'new-student' } }));
const inserted: unknown[] = [];
const write = {
  values: (value: unknown) => {
    inserted.push(value);
    return { onConflictDoNothing: async () => {}, onConflictDoUpdate: async () => {} };
  },
};
const database = {
  query: {
    user: { findFirst: async () => existingBuyer },
    hotmartEvents: {
      findFirst: async () => (duplicate ? { result: 'Already processed' } : undefined),
    },
    hotmartPurchases: {
      findFirst: async () => undefined,
      findMany: async () => [{ transaction: 'purchase' }],
    },
    hotmartProductMappings: { findMany: async () => [{ access: 'sll', productUcode: 'course' }] },
    manualProductGrants: { findFirst: async () => undefined },
  },
  select: () => ({
    from: () => ({
      innerJoin: () => ({
        leftJoin: () => ({
          where: () => ({ limit: async () => [{ transaction: 'purchase' }] }),
        }),
      }),
    }),
  }),
  execute: async () => {},
  insert: () => write,
  transaction: async (run: (tx: unknown) => Promise<unknown>) => run(database),
};
mock.module('@/server/db', () => ({ db: database }));
mock.module('@/server/auth/auth', () => ({ auth: { api: { createUser } } }));
mock.module('@/features/admin/server/overview-cache', () => ({
  revalidateAdminOverview: () => {},
}));
const { processHotmartEvent } = await import('@/features/hotmart/server/process-event');

const event: HotmartPurchaseEvent = {
  id: 'approved-purchase',
  event: 'PURCHASE_APPROVED',
  creation_date: Date.now(),
  version: '2.0.0',
  data: {
    buyer: { email: 'new-student@example.invalid', name: 'New Student' },
    product: { ucode: 'course' },
    purchase: { transaction: 'purchase' },
  },
};

beforeEach(() => {
  existingBuyer = undefined;
  duplicate = false;
  createUser.mockClear();
  inserted.length = 0;
});

test('new Hotmart students keep the default password without email or mandatory change', async () => {
  await processHotmartEvent(event);
  expect(createUser).toHaveBeenCalledWith({
    body: {
      email: event.data.buyer.email,
      name: 'New Student',
      password: 'loja1234',
      role: 'user',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  expect(inserted).toContainEqual({ userId: 'new-student', product: 'sll' });
});

test('another purchase preserves the existing account and its personal password', async () => {
  existingBuyer = { id: 'existing-student' };
  await processHotmartEvent(event);
  expect(createUser).not.toHaveBeenCalled();
  expect(inserted).toContainEqual({ userId: 'existing-student', product: 'sll' });
});

test('replayed events do not create accounts or reset passwords', async () => {
  duplicate = true;
  await processHotmartEvent(event);
  expect(createUser).not.toHaveBeenCalled();
  expect(inserted).toHaveLength(0);
});
