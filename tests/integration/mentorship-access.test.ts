import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { hasCurrentAdminSession } from '@/features/admin/server/current-session';
import { db } from '@/server/db';
import { session, user } from '@/server/db/schema';

afterAll(() => db.$client.end());

test('mentorship writes require the initiating session and current administrator role', async () => {
  const userId = randomUUID();
  const sessionId = randomUUID();
  await db.insert(user).values({
    id: userId,
    email: `${userId}@example.invalid`,
    name: 'Mentorship Admin',
    role: 'admin',
    mustChangePassword: false,
  });
  try {
    await db.insert(session).values({
      id: sessionId,
      userId,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    const check = () => db.transaction((tx) => hasCurrentAdminSession(tx, { userId, sessionId }));
    expect(await check()).toBe(true);
    await db.update(session).set({ impersonatedBy: userId }).where(eq(session.id, sessionId));
    expect(await check()).toBe(false);
    await db
      .update(session)
      .set({ impersonatedBy: null, expiresAt: new Date(0) })
      .where(eq(session.id, sessionId));
    expect(await check()).toBe(false);
    await db
      .update(session)
      .set({ expiresAt: new Date(Date.now() + 60_000) })
      .where(eq(session.id, sessionId));

    const changed = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const demotion = db.transaction(async (tx) => {
      await tx.update(user).set({ role: 'user' }).where(eq(user.id, userId));
      changed.resolve();
      await release.promise;
    });
    try {
      await Promise.race([changed.promise, demotion]);
      const rechecked = check();
      release.resolve();
      expect(await rechecked).toBe(false);
    } finally {
      release.resolve();
      await demotion;
    }
  } finally {
    await db.delete(user).where(eq(user.id, userId));
  }
});
