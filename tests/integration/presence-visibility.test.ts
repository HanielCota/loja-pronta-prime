import { afterAll, beforeAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import { hiddenUserPresence, user, userPresence } from '@/server/db/schema';

const ownerId = randomUUID();
const studentId = randomUUID();
const visibleId = randomUUID();
const studentEmail = `${studentId}@example.invalid`;
let viewer = { id: ownerId, email: 'beedfialho@gmail.com', role: 'admin' };
mock.module('@/features/admin/server/access', () => ({
  requireAdmin: async () => ({ user: viewer }),
  requireStaff: async () => {
    const roles = viewer.role.split(',').map((role) => role.trim());
    const staff = roles.includes('admin') ? 'admin' : roles.includes('support') ? 'support' : null;
    if (!staff) throw new Error('not-found');
    return { user: viewer, staff };
  },
}));
mock.module('next/navigation', () => ({
  unstable_rethrow: () => {},
  notFound: () => {
    throw new Error('not-found');
  },
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
mock.module('next/cache', () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (read: (...args: unknown[]) => unknown) => read,
}));
const { changePresenceVisibility } =
  await import('@/features/admin/server/presence-visibility-actions');
const { getHiddenPresenceAccounts } = await import('@/features/admin/server/presence-visibility');
const { getOnlineStudents, getLastPresence } = await import('@/features/admin/server/online');
const { getOnlineCount } = await import('@/features/admin/server/actions');
const { recordPresence } = await import('@/features/presence/server/record');

beforeAll(async () => {
  await db.insert(user).values([
    { id: ownerId, name: 'Owner fixture', email: `${ownerId}@example.invalid`, role: 'admin' },
    { id: studentId, name: 'Hidden fixture', email: studentEmail, role: 'user' },
    { id: visibleId, name: 'Visible fixture', email: `${visibleId}@example.invalid`, role: 'user' },
  ]);
  await db.insert(userPresence).values([
    { userId: studentId, path: '/sll', lastSeenAt: new Date() },
    { userId: visibleId, path: '/loja-pronta', lastSeenAt: new Date() },
  ]);
});
afterAll(async () => {
  await db.delete(user).where(inArray(user.id, [ownerId, studentId, visibleId]));
  await db.$client.end();
});
const form = (visibility: string, email = studentEmail) => {
  const data = new FormData();
  data.set('email', email);
  data.set('visibility', visibility);
  return data;
};

test('hiding persists across heartbeats and removes presence from every admin surface until restored', async () => {
  const originalCount = await getOnlineCount();
  expect((await getOnlineStudents()).rows.some((row) => row.userId === studentId)).toBe(true);
  await expect(changePresenceVisibility(form('hidden'))).rejects.toThrow(
    'redirect:/admin/online?visibility=saved',
  );
  await expect(changePresenceVisibility(form('hidden'))).rejects.toThrow(
    'redirect:/admin/online?visibility=saved',
  );
  expect((await getHiddenPresenceAccounts()).some((row) => row.id === studentId)).toBe(true);
  await recordPresence({ userId: studentId, path: '/sll/plano', userAgent: null, device: {} });
  for (const account of [
    viewer,
    { id: ownerId, email: 'another-admin@example.invalid', role: 'admin' },
  ]) {
    viewer = account;
    const { rows } = await getOnlineStudents();
    expect(rows.some((row) => row.userId === studentId)).toBe(false);
    expect(rows.some((row) => row.userId === visibleId)).toBe(true);
    expect(await getOnlineCount()).toBe(originalCount - 1);
    expect((await getLastPresence(studentId)).presence).toBeNull();
  }
  await expect(getHiddenPresenceAccounts()).rejects.toThrow('not-found');
  await expect(changePresenceVisibility(form('visible'))).rejects.toThrow('not-found');
  expect(
    await db.select().from(hiddenUserPresence).where(eq(hiddenUserPresence.userId, studentId)),
  ).toHaveLength(1);
  viewer = { id: ownerId, email: 'beedfialho@gmail.com', role: 'user' };
  await expect(changePresenceVisibility(form('visible'))).rejects.toThrow('not-found');
  viewer = { id: ownerId, email: 'beedfialho@gmail.com', role: 'admin' };
  await expect(changePresenceVisibility(form('visible'))).rejects.toThrow(
    'redirect:/admin/online?visibility=saved',
  );
  expect((await getOnlineStudents()).rows.some((row) => row.userId === studentId)).toBe(true);
  expect(await getOnlineCount()).toBe(originalCount);
  expect((await getLastPresence(studentId)).presence?.userId).toBe(studentId);
});

test('invalid input and unknown accounts cannot change visibility', async () => {
  await expect(changePresenceVisibility(form('hidden', 'invalid'))).rejects.toThrow(
    'redirect:/admin/online?visibility=invalid',
  );
  await expect(changePresenceVisibility(form('unexpected'))).rejects.toThrow(
    'redirect:/admin/online?visibility=invalid',
  );
  await expect(
    changePresenceVisibility(form('hidden', `${randomUUID()}@example.invalid`)),
  ).rejects.toThrow('redirect:/admin/online?visibility=missing');
  expect(
    await db.select().from(hiddenUserPresence).where(eq(hiddenUserPresence.userId, studentId)),
  ).toHaveLength(0);
});
