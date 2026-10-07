'use server';

import { getActiveSession } from '@/features/auth/server/session';
import { db } from '@/server/db';
import { userPresence } from '@/server/db/schema';
import { normalizePresencePath } from '../presence';

/** Guarda a página que a aluna logada tem aberta agora. Sem sessão, não faz nada. */
export async function reportPresence(path: string): Promise<void> {
  const session = await getActiveSession();
  const safePath = normalizePresencePath(path);
  if (!session || !safePath) return;
  const now = new Date();
  await db
    .insert(userPresence)
    .values({ userId: session.user.id, path: safePath, lastSeenAt: now })
    .onConflictDoUpdate({
      target: userPresence.userId,
      set: { path: safePath, lastSeenAt: now },
    });
}
