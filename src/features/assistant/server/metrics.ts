import { z } from 'zod';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  shopeeCollectionRuns,
  shopeeMetricSnapshots,
  shopeeConnections,
  user,
  studentProducts,
} from '@/server/db/schema';
import {
  canUseShopee,
  shopeeApplicationId,
  type ShopeeConfiguration,
} from '@/features/shopee/authorization';
import { readShopeeAccess } from '@/features/shopee/server/connection';
import { ShopeeApiError, getShopeeConfiguration } from '@/features/shopee/server/client';
import { readShopeeResource } from '@/features/shopee/server/resources';
import { observationSeries, type MetricObservation } from '../model';
import { collectTrafficReport } from '@/features/shopee/server/traffic-report';

const identifier = z.number().int().positive().safe();
const count = z.number().int().nonnegative().safe().nullable().optional();
const listResponse = z.object({
  item: z.array(z.object({ item_id: identifier })),
  has_next_page: z.boolean(),
  next_offset: z.number().int().nonnegative().optional(),
});
const baseResponse = z.object({
  item_list: z.array(
    z.object({
      item_id: identifier,
      item_name: z.string().max(500),
      category_id: identifier.optional(),
    }),
  ),
});
const extraResponse = z.object({
  item_list: z.array(
    z.object({ item_id: identifier, views: count, sale: count, clicks: count, impressions: count }),
  ),
});

export async function assertAssistantAccess(userId: string, product?: 'sll' | 'loja-pronta') {
  const [account] = await db
    .select({ role: user.role, banned: user.banned, mustChangePassword: user.mustChangePassword })
    .from(user)
    .where(eq(user.id, userId));
  const grants = await db
    .select({ product: studentProducts.product })
    .from(studentProducts)
    .where(eq(studentProducts.userId, userId));
  if (
    !account ||
    account.banned ||
    account.mustChangePassword ||
    !(product ? grants.some((row) => row.product === product) : grants.length)
  )
    throw new ShopeeApiError('rejected');
  const config = getShopeeConfiguration();
  if (!config || !canUseShopee(config, userId, account.role))
    throw new ShopeeApiError('configuration');
  return config;
}

/** Só uma coleta completa é apresentada como atual. Cliques/CTR não são inventados a partir de vendas. */
export async function collectStoreMetrics(
  userId: string,
  config: ShopeeConfiguration,
  fetcher: typeof fetch = fetch,
) {
  const access = await readShopeeAccess(userId, config, fetcher);
  const [run] = await db
    .insert(shopeeCollectionRuns)
    .values({ userId, shopId: access.shopId, applicationId: shopeeApplicationId(config) })
    .returning();
  if (!run) throw new Error('Coleta não criada.');
  try {
    const itemIds: number[] = [];
    let offset = 0;
    for (let page = 0; ; page++) {
      if (page >= 100) throw new ShopeeApiError('response');
      const result = await readShopeeResource(
        config,
        access,
        '/api/v2/product/get_item_list',
        listResponse,
        { offset: String(offset), page_size: '100', item_status: 'NORMAL' },
        fetcher,
      );
      itemIds.push(...result.item.map((item) => item.item_id));
      if (!result.has_next_page) break;
      const next = result.next_offset;
      if (next === undefined || next <= offset) throw new ShopeeApiError('response');
      offset = next;
    }
    const unique = [...new Set(itemIds)];
    for (let start = 0; start < unique.length; start += 50) {
      const ids = unique.slice(start, start + 50);
      const query = { item_id_list: ids.join(',') };
      const base = await readShopeeResource(
        config,
        access,
        '/api/v2/product/get_item_base_info',
        baseResponse,
        query,
        fetcher,
      );
      const extra = await readShopeeResource(
        config,
        access,
        '/api/v2/product/get_item_extra_info',
        extraResponse,
        query,
        fetcher,
      );
      const byId = new Map(extra.item_list.map((item) => [item.item_id, item]));
      if (ids.some((id) => !base.item_list.some((item) => item.item_id === id)))
        throw new ShopeeApiError('response');
      const rows = base.item_list
        .filter((item) => ids.includes(item.item_id))
        .map((item) => ({
          runId: run.id,
          itemId: item.item_id,
          title: item.item_name,
          categoryId: item.category_id ?? null,
          views: byId.get(item.item_id)?.views ?? null,
          sales: byId.get(item.item_id)?.sale ?? null,
          clicks: byId.get(item.item_id)?.clicks ?? null,
          impressions: byId.get(item.item_id)?.impressions ?? null,
        }));
      if (rows.length) await db.insert(shopeeMetricSnapshots).values(rows).onConflictDoNothing();
    }
    let trafficReport = null;
    let trafficFailure = null;
    try {
      trafficReport = await collectTrafficReport(access.shopId, shopeeApplicationId(config));
    } catch {
      trafficFailure = 'report-unavailable';
    }
    await db
      .update(shopeeCollectionRuns)
      .set({
        status: 'completed',
        completedAt: new Date(),
        itemCount: unique.length,
        trafficReport,
        trafficFailure,
      })
      .where(eq(shopeeCollectionRuns.id, run.id));
    return run.id;
  } catch (error) {
    await db
      .update(shopeeCollectionRuns)
      .set({
        status: 'failed',
        failure: error instanceof ShopeeApiError ? error.reason : 'unavailable',
        completedAt: new Date(),
      })
      .where(eq(shopeeCollectionRuns.id, run.id));
    throw error;
  }
}

export async function readStoreObservations(userId: string) {
  const config = getShopeeConfiguration();
  const [connection] = await db
    .select()
    .from(shopeeConnections)
    .where(eq(shopeeConnections.userId, userId));
  if (
    !connection ||
    connection.revokedAt ||
    !config ||
    connection.applicationId !== shopeeApplicationId(config)
  )
    return { status: 'unavailable' as const, runs: [], items: [], windows: [] };
  const all = await db
    .select()
    .from(shopeeCollectionRuns)
    .where(
      and(
        eq(shopeeCollectionRuns.userId, userId),
        eq(shopeeCollectionRuns.shopId, connection.shopId),
        eq(shopeeCollectionRuns.applicationId, connection.applicationId),
      ),
    )
    .orderBy(desc(shopeeCollectionRuns.startedAt))
    .limit(100);
  const completed = all.filter((run) => run.status === 'completed');
  const latest = completed[0];
  if (!latest)
    return {
      status: all[0]?.status === 'failed' ? ('failure' as const) : ('pending' as const),
      runs: all,
      items: [],
      windows: [],
    };
  const earliest = completed[1] ?? latest;
  const rows = await db
    .select()
    .from(shopeeMetricSnapshots)
    .where(inArray(shopeeMetricSnapshots.runId, [latest.id, earliest.id]));
  const values = (runId: string, time: Date): MetricObservation[] =>
    rows
      .filter((row) => row.runId === runId)
      .map((row) => ({ ...row, collectedAt: time.toISOString() }));
  const items = values(latest.id, latest.startedAt);
  const baseline = new Map(
    values(earliest.id, earliest.startedAt).map((item) => [item.itemId, item]),
  );
  const windows = items.flatMap((item) => {
    const first = baseline.get(item.itemId);
    const window = first ? observationSeries([first, item]) : null;
    return window ? [window] : [];
  });
  return {
    status:
      all[0]?.status === 'failed'
        ? ('stale' as const)
        : Date.now() - latest.startedAt.getTime() > 12 * 60 * 60 * 1000
          ? ('outdated' as const)
          : ('ready' as const),
    runs: all,
    items,
    windows,
    shopId: connection.shopId,
    applicationId: connection.applicationId,
  };
}
