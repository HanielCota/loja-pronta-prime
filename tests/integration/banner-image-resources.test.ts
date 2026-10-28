import { expect, mock, test } from 'bun:test';
mock.module('@/server/storage', () => ({
  storage: () => {
    throw new Error('Unexpected real storage access');
  },
}));
const { createBannerImageCache } = await import('@/features/brand/banner-kit/server/images');
const input = {
  userId: 'account',
  revision: 'revision',
  fingerprint: 'fingerprint',
  variant: 'welcome' as const,
  draft: { title: 'Resource test', subtitle: 'Cached export', palette: 'violet' as const },
  name: 'Resource test',
  logoKey: 'logo.png',
};

test('concurrent previews and downloads reuse the same account revision and rendering', async () => {
  let reads = 0,
    renders = 0,
    time = 0;
  const read = createBannerImageCache({
    now: () => time,
    ttlMs: 10,
    readLogo: async () => {
      reads++;
      return new Uint8Array([1]);
    },
    render: async () => {
      renders++;
      return Buffer.from('png');
    },
  });
  const images = await Promise.all(Array.from({ length: 20 }, () => read(input)));
  expect(new Set(images).size).toBe(1);
  expect(reads).toBe(1);
  expect(renders).toBe(1);
  await read(input);
  expect(renders).toBe(1);
  for (const change of [
    { userId: 'other' },
    { revision: 'new' },
    { fingerprint: 'new-brand' },
    { variant: 'selection' as const },
  ])
    await read({ ...input, ...change });
  expect(renders).toBe(5);
  time = 10;
  await read(input);
  expect(renders).toBe(6);
});

test('cached bytes are evicted by size and render failures do not poison retries', async () => {
  let renders = 0;
  const read = createBannerImageCache({
    maxBytes: 6,
    readLogo: async () => new Uint8Array([1]),
    render: async () => {
      renders++;
      if (renders === 1) throw new Error('Temporary renderer failure');
      return Buffer.from('png');
    },
  });
  await expect(read(input)).rejects.toThrow('Temporary');
  await read(input);
  await read({ ...input, revision: '2' });
  await read({ ...input, revision: '3' });
  await read(input);
  expect(renders).toBe(5);
});

test('render concurrency and pending queue stay bounded during bursts', async () => {
  let active = 0,
    peak = 0;
  const finish: (() => void)[] = [];
  const read = createBannerImageCache({
    concurrency: 2,
    maxPending: 3,
    readLogo: async () => new Uint8Array([1]),
    render: async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => finish.push(resolve));
      active--;
      return Buffer.from('png');
    },
  });
  const tasks = [1, 2, 3].map((id) => read({ ...input, revision: String(id) }));
  await expect(read({ ...input, revision: 'overflow' })).rejects.toThrow('queue is full');
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(finish.length).toBe(2);
  finish.shift()!();
  await tasks[0];
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(finish.length).toBe(2);
  for (const resolve of finish.splice(0)) resolve();
  await Promise.all(tasks);
  expect(peak).toBe(2);
  expect(active).toBe(0);
});
