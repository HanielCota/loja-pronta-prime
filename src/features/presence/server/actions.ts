'use server';

import { headers } from 'next/headers';
import { getActiveSession } from '@/features/auth/server/session';
import { db } from '@/server/db';
import { userPresence } from '@/server/db/schema';
import { deviceClientSchema } from '../device';
import { normalizePresencePath } from '../presence';

/**
 * Guarda a página que a aluna logada tem aberta agora e o aparelho (o user agent do pedido e o que
 * o navegador contou). Sem sessão, não faz nada; um aparelho que não passa na validação fica de
 * fora, mas a presença continua valendo.
 */
export async function reportPresence(path: string, device?: unknown): Promise<void> {
  const session = await getActiveSession();
  const safePath = normalizePresencePath(path);
  if (!session || !safePath) return;
  const parsedDevice = deviceClientSchema.safeParse(device);
  const userAgent = (await headers()).get('user-agent')?.slice(0, 512) ?? null;
  const now = new Date();
  const values = {
    path: safePath,
    lastSeenAt: now,
    userAgent,
    ...(parsedDevice.success ? { device: parsedDevice.data } : {}),
  };
  await db
    .insert(userPresence)
    .values({ userId: session.user.id, ...values })
    .onConflictDoUpdate({ target: userPresence.userId, set: values });
}
