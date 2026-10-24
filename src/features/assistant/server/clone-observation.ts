import { and, eq, lte, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  assistantCategoryExperiments,
  shopeeCollectionRuns,
  shopeeMetricSnapshots,
  storeAutomationJobs,
} from '@/server/db/schema';
import { listingCloneSchema } from '../store-changes';

// Só o anúncio de origem importa aqui. Um pedido antigo cujo modelo completo não passa mais na
// validação atual não pode travar a coleta inteira (e, com ela, a reavaliação dos lotes).
const cloneSourceSchema = listingCloneSchema.pick({ item_id: true });

/** O primeiro retrato completo com os dois anúncios vira a base do experimento. */
export async function startReadyCloneExperiments(userId: string, runId: string) {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`assistant-experiment:${userId}`}))`,
    );
    const [run] = await tx
      .select()
      .from(shopeeCollectionRuns)
      .where(
        and(
          eq(shopeeCollectionRuns.id, runId),
          eq(shopeeCollectionRuns.userId, userId),
          eq(shopeeCollectionRuns.status, 'completed'),
        ),
      );
    if (!run) return;
    const snapshots = await tx
      .select()
      .from(shopeeMetricSnapshots)
      .where(eq(shopeeMetricSnapshots.runId, run.id));
    const clones = await tx
      .select()
      .from(storeAutomationJobs)
      .where(
        and(
          eq(storeAutomationJobs.userId, userId),
          eq(storeAutomationJobs.kind, 'clone'),
          eq(storeAutomationJobs.status, 'completed'),
          eq(storeAutomationJobs.shopId, String(run.shopId)),
          eq(storeAutomationJobs.applicationId, run.applicationId),
          lte(storeAutomationJobs.completedAt, run.startedAt),
        ),
      );
    for (const clone of clones) {
      if (!clone.result) continue;
      const parsedSource = cloneSourceSchema.safeParse(clone.payload);
      if (!parsedSource.success) {
        console.error(`[assistant] Pedido de cópia ${clone.id} sem anúncio de origem válido.`);
        continue;
      }
      const sourceId = parsedSource.data.item_id;
      const source = snapshots.find((row) => row.itemId === sourceId);
      const created = snapshots.find((row) => row.itemId === clone.result!.itemId);
      if (!source?.categoryId || !created?.categoryId || source.categoryId === created.categoryId)
        continue;
      const [exists] = await tx
        .select({ id: assistantCategoryExperiments.id })
        .from(assistantCategoryExperiments)
        .where(
          and(
            eq(assistantCategoryExperiments.userId, userId),
            eq(assistantCategoryExperiments.shopId, run.shopId),
            eq(assistantCategoryExperiments.applicationId, run.applicationId),
            eq(assistantCategoryExperiments.leftItemId, sourceId),
            eq(assistantCategoryExperiments.rightItemId, created.itemId),
          ),
        )
        .limit(1);
      if (!exists)
        await tx.insert(assistantCategoryExperiments).values({
          userId,
          shopId: run.shopId,
          applicationId: run.applicationId,
          leftItemId: sourceId,
          rightItemId: created.itemId,
          baselineRunId: run.id,
          minViews: 100,
        });
    }
  });
}
