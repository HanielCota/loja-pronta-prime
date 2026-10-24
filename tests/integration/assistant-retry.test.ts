import { afterAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { assistantJobs, user } from '@/server/db/schema';

mock.module('@/features/admin/server/access', () => ({
  requireAdmin: async () => ({ user: { id: randomUUID(), role: 'admin' } }),
}));
mock.module('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
mock.module('next/cache', () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (read: (...args: unknown[]) => unknown) => read,
}));
const { retryAssistantJob } = await import('@/features/assistant/server/admin-actions');
const { claimAssistantJob, MAX_INTERRUPTED_ATTEMPTS } =
  await import('@/features/assistant/server/operations');

const userId = randomUUID();
afterAll(async () => {
  await db.delete(user).where(eq(user.id, userId));
  await db.$client.end();
});

test('repetir uma leitura bloqueada por interrupções devolve todas as tentativas', async () => {
  await db
    .insert(user)
    .values({ id: userId, email: `${userId}@example.invalid`, name: 'Integração' });
  const past = new Date(Date.now() - 1000);
  const [job] = await db
    .insert(assistantJobs)
    .values({
      userId,
      kind: 'collect',
      deduplicationKey: randomUUID(),
      status: 'blocked',
      failure: 'interrupted',
      attempts: MAX_INTERRUPTED_ATTEMPTS,
      runAt: past,
    })
    .returning();
  const form = new FormData();
  form.set('jobId', job!.id);
  await expect(retryAssistantJob(form)).rejects.toThrow(
    'redirect:/admin/assistente?resultado=saved',
  );
  const [retried] = await db.select().from(assistantJobs).where(eq(assistantJobs.id, job!.id));
  expect(retried).toMatchObject({ status: 'pending', failure: null, attempts: 0 });
  // Pega de novo (primeira tentativa) e o worker cai: volta pra fila em vez de bloquear de novo.
  await db
    .update(assistantJobs)
    .set({ status: 'running', attempts: 1, leaseUntil: past })
    .where(eq(assistantJobs.id, job!.id));
  await claimAssistantJob();
  const [afterCrash] = await db.select().from(assistantJobs).where(eq(assistantJobs.id, job!.id));
  expect(afterCrash?.status).not.toBe('blocked');
});
