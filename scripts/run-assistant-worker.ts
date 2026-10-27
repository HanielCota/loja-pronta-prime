import { setTimeout as delay } from 'node:timers/promises';
import { db } from '../src/server/db';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { runtimeHeartbeats } from '../src/server/db/schema';
import { queueAutomaticBrands } from '../src/features/brand/server/publication';
import { syncSupplierFeeds } from '../src/features/assistant/server/supplier-sync';
import { processRecoveredPublication } from '../src/features/legacy-stores/server/publication-runtime';
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
/**
 * Falhas seguidas toleradas antes de encerrar. Sair do worker reinicia o site inteiro (ver
 * scripts/start-production.mjs): uma queda rápida do banco não pode derrubar as alunas, mas uma
 * falha que persiste precisa reiniciar o conjunto.
 */
const MAX_CONSECUTIVE_FAILURES = 5;

/** Só o tipo e o código: a mensagem crua pode trazer SQL, tokens ou dados da aluna. */
function describeError(error: unknown) {
  const kind = error instanceof Error ? error.name : typeof error;
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  return code ? `${kind} ${code}` : kind;
}

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
    let heartbeatFailures = 0;
    timer = setInterval(() => {
      void heartbeat()
        .then(() => {
          heartbeatFailures = 0;
        })
        .catch((error: unknown) => {
          heartbeatFailures += 1;
          console.error(`[assistant] Sinal de vida falhou: ${describeError(error)}`);
          if (heartbeatFailures < MAX_CONSECUTIVE_FAILURES) return;
          stopping = true;
          process.exitCode = 1;
        });
    }, 15_000);
    let failures = 0;
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
      try {
        const recovered = await processRecoveredPublication();
        if (once && recovered) break;
        const changed = await processStoreChange();
        if (once && changed) break;
        const job = await claimAssistantJob();
        failures = 0;
        if (job) {
          const status = await processAssistantJob(job);
          console.log(`[assistant] ${job.kind} ${job.id}: ${status}`);
        }
        if (!job && !recovered && !once) await delay(5000);
      } catch (error) {
        failures += 1;
        console.error(
          `[assistant] Ciclo falhou (${failures}/${MAX_CONSECUTIVE_FAILURES}): ${describeError(error)}`,
        );
        if (once || failures >= MAX_CONSECUTIVE_FAILURES) throw error;
        await delay(5000);
      }
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
void run().catch((error: unknown) => {
  console.error(
    `[assistant] Rotina interrompida (${describeError(error)}). Confira a conexão e a configuração do servidor.`,
  );
  process.exitCode = 1;
});
