import { afterAll, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { user, userPresence } from '@/server/db/schema';
import { recordPresence } from '@/features/presence/server/record';
import { PRESENCE_REFRESH_MS } from '@/features/presence/presence';

// O servidor pode estar em qualquer fuso; a regra de regravar precisa dar o mesmo resultado.
// Brasília (UTC−3) é o caso que já quebrou: a data ia com o fuso e a coluna lia 3 horas antes.
process.env.TZ = 'America/Sao_Paulo';

const studentId = randomUUID();
const lastSeen = async () =>
  (
    await db
      .select({ path: userPresence.path, lastSeenAt: userPresence.lastSeenAt })
      .from(userPresence)
      .where(eq(userPresence.userId, studentId))
  )[0]!;
const record = (path: string) =>
  recordPresence({ userId: studentId, path, device: {}, userAgent: null });

beforeAll(async () => {
  await db.insert(user).values({
    id: studentId,
    name: 'Presence refresh fixture',
    email: `${studentId}@example.invalid`,
    role: 'user',
  });
});
afterAll(async () => {
  await db.delete(user).where(eq(user.id, studentId));
  await db.$client.end();
});

test('na mesma página, regrava só quando a última gravação passou do prazo', async () => {
  await record('/sll');
  const first = await lastSeen();

  // Logo em seguida, na mesma página: não regrava.
  await Bun.sleep(20);
  await record('/sll');
  expect((await lastSeen()).lastSeenAt.getTime()).toBe(first.lastSeenAt.getTime());

  // A gravação ficou velha (no relógio do banco): o próximo aviso regrava.
  await db
    .update(userPresence)
    .set({
      lastSeenAt: sql`now() - make_interval(secs => ${PRESENCE_REFRESH_MS / 1000 + 5})`,
    })
    .where(eq(userPresence.userId, studentId));
  const stale = await lastSeen();
  await record('/sll');
  const refreshed = await lastSeen();
  expect(refreshed.lastSeenAt.getTime()).toBeGreaterThan(stale.lastSeenAt.getTime());
  // E grava a hora de agora em UTC, não deslocada pelo fuso do processo.
  expect(Math.abs(refreshed.lastSeenAt.getTime() - Date.now())).toBeLessThan(10_000);
});

test('trocar de página sempre regrava, mesmo logo depois', async () => {
  await record('/sll');
  await record('/perfil');
  expect((await lastSeen()).path).toBe('/perfil');
});
