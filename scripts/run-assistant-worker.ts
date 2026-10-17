import { setTimeout as delay } from 'node:timers/promises';
import { db } from '../src/server/db';
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
  try {
    for (;;) {
      const job = await claimAssistantJob();
      if (job) {
        const status = await processAssistantJob(job);
        console.log(`[assistant] ${job.kind} ${job.id}: ${status}`);
      } else if (!once) await delay(5000);
      if (once || stopping) break;
    }
  } finally {
    await db.$client.end();
  }
}
void run().catch(() => {
  console.error('[assistant] Rotina interrompida. Confira a conexão e a configuração do servidor.');
  process.exitCode = 1;
});
