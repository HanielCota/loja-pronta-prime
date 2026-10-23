import { setTimeout as delay } from 'node:timers/promises';
import { db } from '../src/server/db';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { runtimeHeartbeats } from '../src/server/db/schema';
import { queueAutomaticBrands } from '../src/features/brand/server/publication';
import { syncSupplierFeeds } from '../src/features/assistant/server/supplier-sync';
import { processStoreChange } from '../src/features/assistant/server/store-changes';
import {
  claimAssistantJob,
  processAssistantJob,
} from '../src/features/assistant/server/operations';

let stopping = false;
process.on('SIGINT', () => {
  stopping = true;
});
process.on('SIGTERM', () => {
  stopping = true;
});
const once = process.argv.includes('--once');
async function run() {
  const id = randomUUID();
  const heartbeat = async () => {
    await db
      .insert(runtimeHeartbeats)
      .values({ id, service: 'assistant', seenAt: new Date() })
      .onConflictDoUpdate({ target: runtimeHeartbeats.id, set: { seenAt: new Date() } });
  };
  let timer: ReturnType<typeof setInterval> | undefined;
  let nextBrandScan = 0;
  let feedSync: Promise<void> | null = null;
  try {
    await heartbeat();
    timer = setInterval(() => {
      void heartbeat().catch(() => {
        stopping = true;
        process.exitCode = 1;
      });
    }, 15_000);
    for (;;) {
      if (stopping) break;
      if (!feedSync)
        feedSync = syncSupplierFeeds()
          .catch(() => {
            console.error('[supplier] Atualização indisponível.');
          })
          .finally(() => {
            feedSync = null;
          });
      if (Date.now() >= nextBrandScan) {
        nextBrandScan = Date.now() + 60_000;
        await queueAutomaticBrands().catch(() =>
          console.error('[brand] Automatic preparation unavailable.'),
        );
      }
      const changed = await processStoreChange();
      if (once && changed) break;
      const job = await claimAssistantJob();
      if (job) {
        const status = await processAssistantJob(job);
        console.log(`[assistant] ${job.kind} ${job.id}: ${status}`);
      } else if (!once) await delay(5000);
      if (once || stopping) break;
    }
  } finally {
    clearInterval(timer);
    try {
      await feedSync;
      await db.delete(runtimeHeartbeats).where(eq(runtimeHeartbeats.id, id));
    } finally {
      await db.$client.end();
    }
  }
}
void run().catch(() => {
  console.error('[assistant] Rotina interrompida. Confira a conexão e a configuração do servidor.');
  process.exitCode = 1;
});
