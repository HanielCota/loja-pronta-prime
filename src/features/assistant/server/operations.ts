import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  assistantJobs,
  assistantPublicationBatches,
  assistantPublicationItems,
  shopeeCollectionRuns,
  shopeeMetricSnapshots,
  shopeeConnections,
  supplierCatalog,
  supplierPublicationMappings,
  stores,
} from '@/server/db/schema';
import { shopeeApplicationId, type ShopeeConfiguration } from '@/features/shopee/authorization';
import { readShopeeAccess } from '@/features/shopee/server/connection';
import { addShopeeItem, readShopeeResource } from '@/features/shopee/server/resources';
import { ShopeeApiError } from '@/features/shopee/server/client';
import { prepareSupplierProduct } from '@/features/shopee/catalog';
import { z } from 'zod';
import { assertAssistantAccess, collectStoreMetrics } from './metrics';
import {
  batchObservationState,
  DAY_MS,
  observationSeries,
  publicationPayloadSchema,
  validateInitialSelection,
  type BatchAnalysis,
} from '../model';

type Job = typeof assistantJobs.$inferSelect;
class OperationBlocked extends Error {
  constructor(public readonly reason: string) {
    super(reason);
  }
}
const connectionMatches = (
  shop: { shopId: number },
  config: Parameters<typeof shopeeApplicationId>[0],
  record: { shopId: number; applicationId: string },
) => shop.shopId === record.shopId && shopeeApplicationId(config) === record.applicationId;

export async function createPublicationBatch(
  userId: string,
  keys: [string, string][],
  strategy: 'varied' | 'niche',
  kind: 'initial' | 'expansion' = 'initial',
) {
  if (
    kind === 'initial'
      ? !validateInitialSelection(keys.map((key) => JSON.stringify(key)))
      : keys.length < 1 ||
        keys.length > 50 ||
        new Set(keys.map((key) => JSON.stringify(key))).size !== keys.length
  )
    throw new OperationBlocked('selection');
  const config = await assertAssistantAccess(userId, 'loja-pronta');
  if (process.env.SHOPEE_PUBLICATION_ENABLED !== 'true')
    throw new OperationBlocked('publication-disabled');
  const shop = await readShopeeAccess(userId, config);
  const appId = shopeeApplicationId(config);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`assistant-publication:${userId}`}))`,
    );
    const [store] = await tx.select().from(stores).where(eq(stores.userId, userId));
    if (!store || store.phase < 5) throw new OperationBlocked('stage');
    const [initial] = await tx
      .select()
      .from(assistantPublicationBatches)
      .where(
        and(
          eq(assistantPublicationBatches.userId, userId),
          eq(assistantPublicationBatches.shopId, shop.shopId),
          eq(assistantPublicationBatches.applicationId, appId),
          eq(assistantPublicationBatches.kind, 'initial'),
        ),
      );
    if (kind === 'initial' && initial) return initial.id;
    if (kind === 'expansion' && initial?.status !== 'evaluated')
      throw new OperationBlocked('observation');
    const prepared = [];
    for (const [supplierId, sku] of keys) {
      const [catalog] = await tx
        .select()
        .from(supplierCatalog)
        .where(and(eq(supplierCatalog.supplierId, supplierId), eq(supplierCatalog.sku, sku)));
      const [mapping] = await tx
        .select()
        .from(supplierPublicationMappings)
        .where(
          and(
            eq(supplierPublicationMappings.userId, userId),
            eq(supplierPublicationMappings.supplierId, supplierId),
            eq(supplierPublicationMappings.sku, sku),
            eq(supplierPublicationMappings.shopId, shop.shopId),
            eq(supplierPublicationMappings.applicationId, appId),
          ),
        );
      if (!catalog || !mapping) throw new OperationBlocked('catalog-mapping');
      const product = prepareSupplierProduct(catalog.product, new Date());
      if (product.status !== 'prepared' || !('product' in product))
        throw new OperationBlocked('catalog-stale');
      if (product.product.variants.length) throw new OperationBlocked('variants');
      const payload = publicationPayloadSchema.parse(mapping.payload);
      if (
        payload.item_sku !== sku ||
        Math.round(payload.original_price * 100) !== product.product.priceCents ||
        payload.normal_stock > product.product.stock
      )
        throw new OperationBlocked('catalog-price');
      prepared.push({ supplierId, sku, payload });
    }
    if (new Set(prepared.map((item) => item.sku)).size !== prepared.length)
      throw new OperationBlocked('selection');
    const categories = new Set(prepared.map((item) => item.payload.category_id));
    if (
      (strategy === 'niche' && categories.size !== 1) ||
      (strategy === 'varied' && kind === 'initial' && categories.size < 2)
    )
      throw new OperationBlocked('categories');
    const [batch] = await tx
      .insert(assistantPublicationBatches)
      .values({ userId, shopId: shop.shopId, applicationId: appId, strategy, kind })
      .returning();
    if (!batch) throw new Error('Lote não criado.');
    for (const item of prepared) {
      const id = randomUUID();
      await tx.insert(assistantPublicationItems).values({
        id,
        batchId: batch.id,
        userId,
        shopId: shop.shopId,
        applicationId: appId,
        ...item,
      });
      await tx.insert(assistantJobs).values({
        userId,
        kind: 'publish',
        deduplicationKey: `publish:${id}`,
        payload: { itemId: id },
      });
    }
    return batch.id;
  });
}

/** Nenhum timeout de escrita volta automaticamente à fila de publicação. */
export async function claimAssistantJob(now = new Date()) {
  return db.transaction(async (tx) => {
    const uncertain = await tx
      .update(assistantJobs)
      .set({ status: 'unknown', failure: 'interrupted' })
      .where(
        and(
          eq(assistantJobs.status, 'running'),
          eq(assistantJobs.kind, 'publish'),
          lte(assistantJobs.leaseUntil, now),
        ),
      )
      .returning({ payload: assistantJobs.payload });
    for (const job of uncertain)
      if (job.payload.itemId)
        await tx
          .update(assistantPublicationItems)
          .set({ status: 'unknown', failure: 'interrupted' })
          .where(
            and(
              eq(assistantPublicationItems.id, job.payload.itemId),
              eq(assistantPublicationItems.status, 'sending'),
            ),
          );
    await tx
      .update(assistantJobs)
      .set({ status: 'pending', leaseUntil: null })
      .where(
        and(
          eq(assistantJobs.status, 'running'),
          ne(assistantJobs.kind, 'publish'),
          lte(assistantJobs.leaseUntil, now),
        ),
      );
    const [job] = await tx
      .select()
      .from(assistantJobs)
      .where(and(eq(assistantJobs.status, 'pending'), lte(assistantJobs.runAt, now)))
      .orderBy(asc(assistantJobs.runAt))
      .limit(1)
      .for('update', { skipLocked: true });
    if (!job) return null;
    const [claimed] = await tx
      .update(assistantJobs)
      .set({
        status: 'running',
        leaseUntil: new Date(now.getTime() + 5 * 60_000),
        attempts: job.attempts + 1,
      })
      .where(eq(assistantJobs.id, job.id))
      .returning();
    return claimed ?? null;
  });
}

/** A confirmação do último anúncio inicia um único relógio, inclusive após conciliação. */
async function confirmPublishedItem(
  item: typeof assistantPublicationItems.$inferSelect,
  itemId: number,
) {
  await db.transaction(async (tx) => {
    const [batch] = await tx
      .select()
      .from(assistantPublicationBatches)
      .where(eq(assistantPublicationBatches.id, item.batchId))
      .for('update');
    if (!batch) throw new Error('Lote ausente.');
    const now = new Date();
    await tx
      .update(assistantPublicationItems)
      .set({ status: 'published', itemId, publishedAt: now, failure: null })
      .where(eq(assistantPublicationItems.id, item.id));
    const items = await tx
      .select()
      .from(assistantPublicationItems)
      .where(eq(assistantPublicationItems.batchId, batch.id));
    if (items.every((row) => row.status === 'published') && !batch.publishedAt) {
      await tx
        .update(assistantPublicationBatches)
        .set({ status: 'observing', publishedAt: now })
        .where(eq(assistantPublicationBatches.id, batch.id));
      if (batch.kind === 'initial')
        await tx
          .insert(assistantJobs)
          .values({
            userId: item.userId,
            kind: 'evaluate',
            deduplicationKey: `evaluate:${batch.id}:initial`,
            payload: { batchId: batch.id },
            runAt: new Date(now.getTime() + 5 * DAY_MS),
          })
          .onConflictDoNothing();
      await tx
        .insert(assistantJobs)
        .values({
          userId: item.userId,
          kind: 'collect',
          deduplicationKey: `collect:batch:${batch.id}`,
        })
        .onConflictDoNothing();
      await tx
        .update(stores)
        .set({ phase: 6 })
        .where(and(eq(stores.userId, item.userId), eq(stores.phase, 5)));
    }
  });
}

async function findSku(
  config: ShopeeConfiguration,
  access: { shopId: number; accessToken: string },
  sku: string,
  fetcher: typeof fetch,
) {
  const matches = new Map<number, { item_id: number; item_sku: string; item_name: string }>();
  for (const status of ['NORMAL', 'UNLIST', 'BANNED'])
    for (let offset = 0, page = 0; ; page++) {
      if (page >= 100) throw new OperationBlocked('catalog-limit');
      const list = await readShopeeResource(
        config,
        access,
        '/api/v2/product/get_item_list',
        z.object({
          item: z.array(z.object({ item_id: z.number().int().positive().safe() })),
          has_next_page: z.boolean(),
          next_offset: z.number().int().nonnegative().optional(),
        }),
        { offset: String(offset), page_size: '100', item_status: status },
        fetcher,
      );
      for (let start = 0; start < list.item.length; start += 50) {
        const ids = list.item.slice(start, start + 50).map((row) => row.item_id);
        const base = await readShopeeResource(
          config,
          access,
          '/api/v2/product/get_item_base_info',
          z.object({
            item_list: z.array(
              z.object({
                item_id: z.number().int().positive().safe(),
                item_sku: z.string(),
                item_name: z.string(),
              }),
            ),
          }),
          { item_id_list: ids.join(',') },
          fetcher,
        );
        if (ids.some((id) => !base.item_list.some((row) => row.item_id === id)))
          throw new OperationBlocked('response');
        for (const row of base.item_list) if (row.item_sku === sku) matches.set(row.item_id, row);
      }
      if (!list.has_next_page) break;
      if (list.next_offset === undefined || list.next_offset <= offset)
        throw new OperationBlocked('catalog-limit');
      offset = list.next_offset;
    }
  return [...matches.values()];
}

async function publishItem(job: Job, fetcher: typeof fetch) {
  const config = await assertAssistantAccess(job.userId, 'loja-pronta');
  if (process.env.SHOPEE_PUBLICATION_ENABLED !== 'true')
    throw new OperationBlocked('publication-disabled');
  const [item] = await db
    .select()
    .from(assistantPublicationItems)
    .where(
      and(
        eq(assistantPublicationItems.id, job.payload.itemId ?? ''),
        eq(assistantPublicationItems.userId, job.userId),
      ),
    );
  if (!item) throw new OperationBlocked('item');
  if (item.status === 'published') return;
  if (item.status !== 'pending' && item.status !== 'failed')
    throw new OperationBlocked('reconciliation');
  const access = await readShopeeAccess(job.userId, config, fetcher);
  if (!connectionMatches(access, config, item)) throw new OperationBlocked('connection-changed');
  const [catalog] = await db
    .select()
    .from(supplierCatalog)
    .where(and(eq(supplierCatalog.supplierId, item.supplierId), eq(supplierCatalog.sku, item.sku)));
  if (!catalog) throw new OperationBlocked('catalog-mapping');
  const fresh = prepareSupplierProduct(catalog.product, new Date());
  const payload = publicationPayloadSchema.parse(item.payload);
  if (
    fresh.status !== 'prepared' ||
    !('product' in fresh) ||
    fresh.product.variants.length ||
    Math.round(payload.original_price * 100) !== fresh.product.priceCents ||
    payload.normal_stock > fresh.product.stock
  )
    throw new OperationBlocked('catalog-stale');
  if ((await findSku(config, access, payload.item_sku, fetcher)).length)
    throw new OperationBlocked('sku-exists');
  const [sending] = await db
    .update(assistantPublicationItems)
    .set({ status: 'sending', failure: null })
    .where(
      and(
        eq(assistantPublicationItems.id, item.id),
        inArray(assistantPublicationItems.status, ['pending', 'failed']),
      ),
    )
    .returning({ id: assistantPublicationItems.id });
  if (!sending) throw new OperationBlocked('reconciliation');
  let itemId: number;
  try {
    itemId = (await addShopeeItem(config, access, payload, fetcher)).item_id;
  } catch (error) {
    const uncertain = !(error instanceof ShopeeApiError && error.reason === 'rejected');
    await db
      .update(assistantPublicationItems)
      .set({
        status: uncertain ? 'unknown' : 'failed',
        failure: error instanceof ShopeeApiError ? error.reason : 'response',
      })
      .where(eq(assistantPublicationItems.id, item.id));
    throw new OperationBlocked(uncertain ? 'uncertain' : 'rejected');
  }
  try {
    await confirmPublishedItem(item, itemId);
  } catch {
    await db
      .update(assistantPublicationItems)
      .set({ status: 'unknown', failure: 'persistence' })
      .where(
        and(
          eq(assistantPublicationItems.id, item.id),
          eq(assistantPublicationItems.status, 'sending'),
        ),
      );
    throw new OperationBlocked('uncertain');
  }
}

export async function evaluatePublicationBatch(userId: string, batchId: string, now = new Date()) {
  const [batch] = await db
    .select()
    .from(assistantPublicationBatches)
    .where(
      and(
        eq(assistantPublicationBatches.id, batchId),
        eq(assistantPublicationBatches.userId, userId),
      ),
    );
  if (!batch || batch.kind !== 'initial') throw new OperationBlocked('batch');
  if (batch.status === 'evaluated') return batch.analysis;
  if (batchObservationState(batch.publishedAt, now).status !== 'ready')
    throw new OperationBlocked('observation');
  const [connection] = await db
    .select()
    .from(shopeeConnections)
    .where(eq(shopeeConnections.userId, userId));
  if (
    !connection ||
    connection.revokedAt ||
    connection.shopId !== batch.shopId ||
    connection.applicationId !== batch.applicationId
  )
    throw new OperationBlocked('connection-changed');
  const items = await db
    .select()
    .from(assistantPublicationItems)
    .where(eq(assistantPublicationItems.batchId, batch.id));
  if (items.length !== 5 || items.some((item) => item.status !== 'published' || !item.itemId))
    throw new OperationBlocked('observation');
  const runs = await db
    .select()
    .from(shopeeCollectionRuns)
    .where(
      and(
        eq(shopeeCollectionRuns.userId, userId),
        eq(shopeeCollectionRuns.shopId, batch.shopId),
        eq(shopeeCollectionRuns.applicationId, batch.applicationId),
        eq(shopeeCollectionRuns.status, 'completed'),
        sql`${shopeeCollectionRuns.startedAt} >= ${batch.publishedAt!.toISOString()}::timestamptz`,
      ),
    )
    .orderBy(asc(shopeeCollectionRuns.startedAt));
  const first = runs[0];
  const last = runs.at(-1);
  let analysis: BatchAnalysis = {
    status: 'insufficient',
    message: 'Ainda não há duas coletas completas cobrindo cinco dias para os cinco produtos.',
    items: [],
    preferredCategoryId: null,
    runIds: [],
  };
  if (first && last && last.startedAt.getTime() - first.startedAt.getTime() >= 5 * DAY_MS) {
    const snapshots = await db
      .select()
      .from(shopeeMetricSnapshots)
      .where(
        inArray(
          shopeeMetricSnapshots.runId,
          runs.map((run) => run.id),
        ),
      );
    const windows = items.map((item) => {
      return observationSeries(
        runs.map((run) => {
          const snapshot = snapshots.find(
            (row) => row.runId === run.id && row.itemId === item.itemId,
          );
          return snapshot ? { ...snapshot, collectedAt: run.startedAt.toISOString() } : undefined;
        }),
      );
    });
    if (windows.every((window) => window && window.views !== null)) {
      const observed = windows.map((window) => ({
        itemId: window!.itemId,
        views: window!.views,
        categoryId: window!.categoryId,
      }));
      const best = observed.toSorted((a, b) => (b.views ?? 0) - (a.views ?? 0));
      const top = best[0]!;
      const tied = best[1]?.views === top.views;
      analysis = {
        status: 'ready',
        items: observed,
        runIds: [first.id, last.id],
        preferredCategoryId: !tied && top.views! > 0 ? top.categoryId : null,
        message:
          top.views === 0
            ? 'Os cinco produtos não receberam visualizações registradas no período. Revise a exposição antes de ampliar o catálogo.'
            : tied
              ? 'Os produtos com mais visualizações empataram. Confira os resultados antes de escolher os próximos.'
              : 'A categoria do produto com mais visualizações pode orientar a próxima seleção. Esse resultado é observado e não garante vendas.',
      };
    }
  }
  await db
    .update(assistantPublicationBatches)
    .set({
      analysis,
      ...(analysis.status === 'ready' ? { status: 'evaluated' as const, evaluatedAt: now } : {}),
    })
    .where(eq(assistantPublicationBatches.id, batch.id));
  return analysis;
}

export async function processAssistantJob(job: Job, fetcher: typeof fetch = fetch) {
  const owns = () =>
    and(
      eq(assistantJobs.id, job.id),
      eq(assistantJobs.status, 'running'),
      eq(assistantJobs.attempts, job.attempts),
    );
  const heartbeat = setInterval(() => {
    void db
      .update(assistantJobs)
      .set({ leaseUntil: new Date(Date.now() + 5 * 60_000) })
      .where(owns())
      .catch(() => {});
  }, 30_000);
  try {
    const config = await assertAssistantAccess(
      job.userId,
      job.kind === 'publish' ? 'loja-pronta' : undefined,
    );
    if (job.kind === 'collect') {
      const runId = await collectStoreMetrics(job.userId, config, fetcher);
      const due = await db
        .select()
        .from(assistantPublicationBatches)
        .where(
          and(
            eq(assistantPublicationBatches.userId, job.userId),
            eq(assistantPublicationBatches.status, 'observing'),
            eq(assistantPublicationBatches.kind, 'initial'),
            lte(assistantPublicationBatches.publishedAt, new Date(Date.now() - 5 * DAY_MS)),
          ),
        );
      for (const batch of due)
        await db
          .insert(assistantJobs)
          .values({
            userId: job.userId,
            kind: 'evaluate',
            deduplicationKey: `evaluate:${batch.id}:${runId}`,
            payload: { batchId: batch.id },
          })
          .onConflictDoNothing();
      const next = new Date(Date.now() + 6 * 60 * 60 * 1000);
      await db
        .insert(assistantJobs)
        .values({
          userId: job.userId,
          kind: 'collect',
          deduplicationKey: `collect:${job.userId}:${Math.floor(next.getTime() / (6 * 60 * 60 * 1000))}:scheduled`,
          runAt: next,
        })
        .onConflictDoNothing();
    } else if (job.kind === 'publish') await publishItem(job, fetcher);
    else if (job.payload.batchId) await evaluatePublicationBatch(job.userId, job.payload.batchId);
    else throw new OperationBlocked('batch');
    await db
      .update(assistantJobs)
      .set({ status: 'completed', failure: null, leaseUntil: null })
      .where(owns());
    return 'completed' as const;
  } catch (error) {
    const reason =
      error instanceof OperationBlocked
        ? error.reason
        : error instanceof ShopeeApiError
          ? error.reason
          : 'unavailable';
    let status = reason === 'uncertain' ? ('unknown' as const) : ('blocked' as const);
    if (job.kind === 'publish' && job.payload.itemId) {
      const [uncertain] = await db
        .update(assistantPublicationItems)
        .set({ status: 'unknown', failure: 'interrupted' })
        .where(
          and(
            eq(assistantPublicationItems.id, job.payload.itemId),
            eq(assistantPublicationItems.status, 'sending'),
          ),
        )
        .returning({ id: assistantPublicationItems.id });
      if (uncertain) status = 'unknown';
    }
    await db.update(assistantJobs).set({ status, failure: reason, leaseUntil: null }).where(owns());
    return status;
  } finally {
    clearInterval(heartbeat);
  }
}

/** Consulta antes de repetir uma publicação que pode já ter sido aceita. */
export async function reconcilePublicationItem(
  userId: string,
  itemId: string,
  fetcher: typeof fetch = fetch,
) {
  const config = await assertAssistantAccess(userId, 'loja-pronta');
  const access = await readShopeeAccess(userId, config, fetcher);
  const [item] = await db
    .select()
    .from(assistantPublicationItems)
    .where(
      and(eq(assistantPublicationItems.id, itemId), eq(assistantPublicationItems.userId, userId)),
    );
  if (!item || item.status !== 'unknown' || !connectionMatches(access, config, item))
    throw new OperationBlocked('reconciliation');
  const matches = await findSku(config, access, item.payload.item_sku, fetcher);
  if (matches.length !== 1 || matches[0]?.item_name !== item.payload.item_name)
    return { status: matches.length ? ('ambiguous' as const) : ('not-found' as const) };
  await confirmPublishedItem(item, matches[0]!.item_id);
  await db
    .update(assistantJobs)
    .set({ status: 'completed', failure: null, leaseUntil: null })
    .where(eq(assistantJobs.deduplicationKey, `publish:${item.id}`));
  return { status: 'matched' as const, itemId: matches[0]!.item_id };
}

export async function publicationOverview(userId: string) {
  const [connection] = await db
    .select()
    .from(shopeeConnections)
    .where(eq(shopeeConnections.userId, userId));
  if (!connection || connection.revokedAt) return { batches: [], items: [] };
  const batches = await db
    .select()
    .from(assistantPublicationBatches)
    .where(
      and(
        eq(assistantPublicationBatches.userId, userId),
        eq(assistantPublicationBatches.shopId, connection.shopId),
        eq(assistantPublicationBatches.applicationId, connection.applicationId),
      ),
    )
    .orderBy(desc(assistantPublicationBatches.createdAt));
  const items = batches.length
    ? await db
        .select()
        .from(assistantPublicationItems)
        .where(
          inArray(
            assistantPublicationItems.batchId,
            batches.map((batch) => batch.id),
          ),
        )
    : [];
  return { batches, items };
}
