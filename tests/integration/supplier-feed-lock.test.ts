import { afterAll, expect, mock, test } from 'bun:test';

const previous = process.env.SUPPLIER_FEEDS;
process.env.SUPPLIER_FEEDS = JSON.stringify([
  {
    id: 'lock-test',
    name: 'Lock test',
    url: 'https://supplier.example/feed',
    imageHosts: ['supplier.example'],
  },
]);
let failUnlock = false;
let acquired = false;
const releases: boolean[] = [];
const client = {
  query: async (sql: string) => {
    if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: acquired }] };
    if (failUnlock) throw new Error('Connection interrupted during unlock');
    return { rows: [{ pg_advisory_unlock: false }] };
  },
  release: (discard: boolean) => {
    releases.push(discard);
  },
};
mock.module('@/server/db', () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => [{ userId: 'test' }] }) }),
    }),
    update: () => ({ set: () => ({ where: async () => {} }) }),
    $client: { connect: async () => client },
  },
}));
const { syncSupplierFeeds } = await import('@/features/assistant/server/supplier-sync');
afterAll(() => {
  if (previous === undefined) delete process.env.SUPPLIER_FEEDS;
  else process.env.SUPPLIER_FEEDS = previous;
});

test('supplier lock contention releases the checked out connection', async () => {
  await syncSupplierFeeds();
  expect(releases).toEqual([false]);
});

test('failed supplier unlock discards the connection even when cleanup throws', async () => {
  failUnlock = true;
  acquired = true;
  await syncSupplierFeeds({
    download: async () => {
      throw new Error('Feed unavailable');
    },
  });
  expect(releases).toEqual([false, true]);
});
