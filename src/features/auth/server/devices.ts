import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { describeDevice, deviceSummary } from '@/features/presence/device';
import { db } from '@/server/db';
import { session } from '@/server/db/schema';
import type { AccountDevice } from '../account-device';

/**
 * Os aparelhos com a conta aberta agora, como na conta Apple: o atual primeiro, depois os mais
 * recentes. Sessões abertas pelo admin ("entrar como") ficam de fora: não são dela.
 */
export async function getAccountDevices(
  userId: string,
  currentSessionId: string,
): Promise<AccountDevice[]> {
  const rows = await db
    .select({
      id: session.id,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
    })
    .from(session)
    .where(
      and(
        eq(session.userId, userId),
        gt(session.expiresAt, new Date()),
        isNull(session.impersonatedBy),
      ),
    )
    .orderBy(desc(session.createdAt));

  return rows
    .map((row) => {
      const device = describeDevice(row.userAgent);
      return {
        id: row.id,
        kind: device.kind,
        kindLabel: device.kindLabel,
        summary: deviceSummary(device),
        signedInAt: row.createdAt,
        current: row.id === currentSessionId,
      };
    })
    .toSorted((a, b) => Number(b.current) - Number(a.current));
}
