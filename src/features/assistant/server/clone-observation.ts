import { and, eq, lte, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  assistantCategoryExperiments,
  shopeeCollectionRuns,
  shopeeMetricSnapshots,
  storeAutomationJobs,
} from '@/server/db/schema';
import { listingCloneSchema } from '../store-changes';

/** O primeiro retrato completo com os dois anúncios vira a base do experimento. */
export async function startReadyCloneExperiments(userId: string, runId: string) {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`assistant-experiment:${userId}`}))`,
    );
    const [run] = await tx
      .select({
        id: shopeeCollectionRuns.id,
        shopId: shopeeCollectionRuns.shopId,
        applicationId: shopeeCollectionRuns.applicationId,
        startedAt: shopeeCollectionRuns.startedAt,
      })
      .from(shopeeCollectionRuns)
      .where(
        and(
          eq(shopeeCollectionRuns.id, runId),
          eq(shopeeCollectionRuns.userId, userId),
          eq(shopeeCollectionRuns.status, 'completed'),
        ),
      );
    if (!run) return;
    // Uma leitura de cada tabela e buscas por mapa: antes era uma consulta por clone e um
    // `find` nos retratos da loja inteira (clones × anúncios) dentro do bloqueio da aluna.
    const snapshots = await tx
      .select({
        itemId: shopeeMetricSnapshots.itemId,
        categoryId: shopeeMetricSnapshots.categoryId,
      })
      .from(shopeeMetricSnapshots)
      .where(eq(shopeeMetricSnapshots.runId, run.id));
    const clones = await tx
      .select({
        id: storeAutomationJobs.id,
        // Só o anúncio de origem: o modelo inteiro do clone não é usado aqui.
        sourceItemId: sql<unknown>`${storeAutomationJobs.payload} -> 'item_id'`,
        result: storeAutomationJobs.result,
      })
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
    const experiments = await tx
      .select({
        leftItemId: assistantCategoryExperiments.leftItemId,
        rightItemId: assistantCategoryExperiments.rightItemId,
      })
      .from(assistantCategoryExperiments)
      .where(
        and(
          eq(assistantCategoryExperiments.userId, userId),
          eq(assistantCategoryExperiments.shopId, run.shopId),
          eq(assistantCategoryExperiments.applicationId, run.applicationId),
        ),
      );
    const categoryByItem = new Map(snapshots.map((row) => [row.itemId, row.categoryId]));
    const existing = new Set(
      experiments.map((experiment) => `${experiment.leftItemId}:${experiment.rightItemId}`),
    );
    const created = [];
    for (const clone of clones) {
      if (!clone.result) continue;
      // Um pedido antigo sem anúncio de origem válido não pode travar a coleta inteira.
      const parsedSource = listingCloneSchema.shape.item_id.safeParse(clone.sourceItemId);
      if (!parsedSource.success) {
        console.error(`[assistant] Pedido de cópia ${clone.id} sem anúncio de origem válido.`);
        continue;
      }
      const sourceId = parsedSource.data;
      const createdId = clone.result.itemId;
      const sourceCategory = categoryByItem.get(sourceId);
      const createdCategory = categoryByItem.get(createdId);
      if (!sourceCategory || !createdCategory || sourceCategory === createdCategory) continue;
      const pair = `${sourceId}:${createdId}`;
      if (existing.has(pair)) continue;
      existing.add(pair);
      created.push({
        userId,
        shopId: run.shopId,
        applicationId: run.applicationId,
        leftItemId: sourceId,
        rightItemId: createdId,
        baselineRunId: run.id,
        minViews: 100,
      });
    }
    if (created.length) await tx.insert(assistantCategoryExperiments).values(created);
  });
}
