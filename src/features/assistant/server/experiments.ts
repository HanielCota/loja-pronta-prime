import { and, asc, desc, eq, inArray, gte, lte } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  assistantCategoryExperiments,
  shopeeCollectionRuns,
  shopeeConnections,
  shopeeMetricSnapshots,
} from '@/server/db/schema';
import { shopeeApplicationId } from '@/features/shopee/authorization';
import { getShopeeConfiguration } from '@/features/shopee/server/client';
import { compareCategories, observationSeries } from '../model';

export async function readCategoryExperiments(userId: string) {
  const [connection] = await db
    .select()
    .from(shopeeConnections)
    .where(eq(shopeeConnections.userId, userId));
  const config = getShopeeConfiguration();
  if (
    !connection ||
    connection.revokedAt ||
    !config ||
    connection.applicationId !== shopeeApplicationId(config)
  )
    return [];
  const experiments = await db
    .select()
    .from(assistantCategoryExperiments)
    .where(
      and(
        eq(assistantCategoryExperiments.userId, userId),
        eq(assistantCategoryExperiments.shopId, connection.shopId),
        eq(assistantCategoryExperiments.applicationId, connection.applicationId),
      ),
    )
    .orderBy(desc(assistantCategoryExperiments.createdAt))
    .limit(50);
  if (!experiments.length) return [];
  // Tudo é da mesma loja: a última coleta, as bases, as coletas do período e os retratos dos
  // anúncios comparados vêm de uma vez, em vez de 4 consultas por experimento (até 200 por tela).
  const sameShop = and(
    eq(shopeeCollectionRuns.userId, userId),
    eq(shopeeCollectionRuns.shopId, connection.shopId),
    eq(shopeeCollectionRuns.applicationId, connection.applicationId),
    eq(shopeeCollectionRuns.status, 'completed'),
  );
  const [[latest], baselines] = await Promise.all([
    db
      .select()
      .from(shopeeCollectionRuns)
      .where(sameShop)
      .orderBy(desc(shopeeCollectionRuns.startedAt))
      .limit(1),
    db
      .select({ id: shopeeCollectionRuns.id, startedAt: shopeeCollectionRuns.startedAt })
      .from(shopeeCollectionRuns)
      .where(
        and(
          sameShop,
          inArray(
            shopeeCollectionRuns.id,
            experiments.map((experiment) => experiment.baselineRunId),
          ),
        ),
      ),
  ]);
  const baselineById = new Map(baselines.map((baseline) => [baseline.id, baseline]));
  const compared = experiments.filter((experiment) => {
    const baseline = baselineById.get(experiment.baselineRunId);
    return baseline && latest && latest.id !== baseline.id;
  });
  const oldest = compared.reduce<Date | null>((first, experiment) => {
    const startedAt = baselineById.get(experiment.baselineRunId)!.startedAt;
    return !first || startedAt < first ? startedAt : first;
  }, null);
  const runs =
    latest && oldest
      ? await db
          .select({ id: shopeeCollectionRuns.id, startedAt: shopeeCollectionRuns.startedAt })
          .from(shopeeCollectionRuns)
          .where(
            and(
              sameShop,
              gte(shopeeCollectionRuns.startedAt, oldest),
              lte(shopeeCollectionRuns.startedAt, latest.startedAt),
            ),
          )
          .orderBy(asc(shopeeCollectionRuns.startedAt))
      : [];
  const itemIds = [
    ...new Set(compared.flatMap((experiment) => [experiment.leftItemId, experiment.rightItemId])),
  ];
  const snapshots =
    runs.length && itemIds.length
      ? await db
          .select()
          .from(shopeeMetricSnapshots)
          .where(
            and(
              inArray(
                shopeeMetricSnapshots.runId,
                runs.map((run) => run.id),
              ),
              inArray(shopeeMetricSnapshots.itemId, itemIds),
            ),
          )
      : [];
  const byRunAndItem = new Map(snapshots.map((row) => [`${row.runId}:${row.itemId}`, row]));
  const output = [];
  for (const experiment of experiments) {
    const baseline = baselineById.get(experiment.baselineRunId);
    let result: {
      status: string;
      message: string;
      preferredItemId?: number | null;
      leftCtr?: number | null;
      rightCtr?: number | null;
      start?: string;
      end?: string;
      source?: string;
    } = {
      status: 'pending',
      message: 'Aguardando uma nova coleta para comparar o período.',
    };
    if (baseline && latest && latest.id !== baseline.id) {
      const period = runs.filter(
        (run) => run.startedAt >= baseline.startedAt && run.startedAt <= latest.startedAt,
      );
      const window = (itemId: number) => {
        return observationSeries(
          period.map((run) => {
            const row = byRunAndItem.get(`${run.id}:${itemId}`);
            return row ? { ...row, collectedAt: run.startedAt.toISOString() } : undefined;
          }),
        );
      };
      const left = window(experiment.leftItemId);
      const right = window(experiment.rightItemId);
      result =
        left && right
          ? compareCategories(left, right, experiment.minViews)
          : {
              status: 'incomparable',
              message:
                'A categoria, o contador ou a disponibilidade dos anúncios mudou no período. Comece uma nova comparação.',
            };
    }
    const report = latest?.trafficReport;
    if (report && baseline && Date.parse(report.start) >= baseline.startedAt.getTime()) {
      const left = report.items.find((row) => row.itemId === experiment.leftItemId);
      const right = report.items.find((row) => row.itemId === experiment.rightItemId);
      if (left && right) {
        result = {
          ...compareCategories(
            { ...left, start: report.start, end: report.end },
            { ...right, start: report.start, end: report.end },
            experiment.minViews,
          ),
          start: report.start,
          end: report.end,
          source: report.source,
        };
      }
    }
    output.push({ ...experiment, result });
  }
  return output;
}
