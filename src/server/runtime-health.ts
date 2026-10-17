import { gt, eq, and } from 'drizzle-orm';
import { db } from './db';
import { runtimeHeartbeats } from './db/schema';

export async function hasHealthyAssistantWorker() {
  const [heartbeat] = await db
    .select({ id: runtimeHeartbeats.id })
    .from(runtimeHeartbeats)
    .where(
      and(
        eq(runtimeHeartbeats.service, 'assistant'),
        gt(runtimeHeartbeats.seenAt, new Date(Date.now() - 90_000)),
      ),
    )
    .limit(1);
  return Boolean(heartbeat);
}
