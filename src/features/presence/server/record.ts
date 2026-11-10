import { sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { userPresence } from '@/server/db/schema';
import { deviceClientSchema } from '../device';
import { normalizePresencePath, PRESENCE_REFRESH_MS } from '../presence';

/**
 * Guarda a página que a conta tem aberta agora e o aparelho (o user agent do pedido e o que o
 * navegador contou). Um caminho inválido não grava nada; um aparelho que não passa na validação
 * fica de fora, mas a presença continua valendo.
 */
export async function recordPresence({
  userId,
  path,
  device,
  userAgent,
}: {
  userId: string;
  path: unknown;
  device: unknown;
  userAgent: string | null;
}): Promise<boolean> {
  const safePath = normalizePresencePath(path);
  if (!safePath) return false;
  const parsedDevice = deviceClientSchema.safeParse(device);
  const values = {
    path: safePath,
    lastSeenAt: new Date(),
    userAgent: userAgent?.slice(0, 512) ?? null,
    ...(parsedDevice.success ? { device: parsedDevice.data } : {}),
  };
  await db
    .insert(userPresence)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: userPresence.userId,
      set: values,
      // Mesma página e gravação recente: nada muda pra quem olha a lista, então não regrava.
      setWhere: sql`${userPresence.path} <> excluded.path or ${userPresence.lastSeenAt} < ${new Date(Date.now() - PRESENCE_REFRESH_MS)}`,
    });
  return true;
}
