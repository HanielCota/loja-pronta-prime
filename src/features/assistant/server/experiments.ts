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
  const output = [];
  for (const experiment of experiments) {
    const [baseline] = await db
      .select()
      .from(shopeeCollectionRuns)
      .where(
        and(
          eq(shopeeCollectionRuns.id, experiment.baselineRunId),
          eq(shopeeCollectionRuns.userId, userId),
          eq(shopeeCollectionRuns.shopId, experiment.shopId),
          eq(shopeeCollectionRuns.applicationId, experiment.applicationId),
          eq(shopeeCollectionRuns.status, 'completed'),
        ),
      );
    const [latest] = await db
      .select()
      .from(shopeeCollectionRuns)
      .where(
        and(
          eq(shopeeCollectionRuns.userId, userId),
          eq(shopeeCollectionRuns.shopId, experiment.shopId),
          eq(shopeeCollectionRuns.applicationId, experiment.applicationId),
          eq(shopeeCollectionRuns.status, 'completed'),
        ),
      )
      .orderBy(desc(shopeeCollectionRuns.startedAt))
      .limit(1);
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
      const runs = await db
        .select({ id: shopeeCollectionRuns.id, startedAt: shopeeCollectionRuns.startedAt })
        .from(shopeeCollectionRuns)
        .where(
          and(
            eq(shopeeCollectionRuns.userId, userId),
            eq(shopeeCollectionRuns.shopId, experiment.shopId),
            eq(shopeeCollectionRuns.applicationId, experiment.applicationId),
            eq(shopeeCollectionRuns.status, 'completed'),
            gte(shopeeCollectionRuns.startedAt, baseline.startedAt),
            lte(shopeeCollectionRuns.startedAt, latest.startedAt),
          ),
        )
        .orderBy(asc(shopeeCollectionRuns.startedAt));
      const snapshots = await db
        .select()
        .from(shopeeMetricSnapshots)
        .where(
          and(
            inArray(
              shopeeMetricSnapshots.runId,
              runs.map((run) => run.id),
            ),
            inArray(shopeeMetricSnapshots.itemId, [experiment.leftItemId, experiment.rightItemId]),
          ),
        );
      const window = (itemId: number) => {
        return observationSeries(
          runs.map((run) => {
            const row = snapshots.find(
              (snapshot) => snapshot.runId === run.id && snapshot.itemId === itemId,
            );
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
