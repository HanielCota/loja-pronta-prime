import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, gt, gte, inArray, lt, lte, ne, sql } from 'drizzle-orm';
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
import { shopeeItemListPageSchema } from '@/features/shopee/item-list';
import { readShopeeAccess } from '@/features/shopee/server/connection';
import {
  addShopeeItem,
  readShopeeResource,
  writeShopeeResource,
} from '@/features/shopee/server/resources';
import { ShopeeApiError } from '@/features/shopee/server/client';
import { prepareSupplierProduct } from '@/features/shopee/catalog';
import { z } from 'zod';
import { matchesSupplierOffer } from '../supplier-offer';
import {
  publishProductVariations,
  readProductModels,
  modelsMatchPublication,
} from '@/features/shopee/server/variations';
import { assertAssistantAccess, collectStoreMetrics } from './metrics';
import {
  batchObservationState,
  DAY_MS,
  observationSeries,
  publicationPayloadSchema,
  validateInitialSelection,
  type BatchAnalysis,
} from '../model';

import { publicationOfferFingerprint, type PublicationSelection } from '../publication-selection';
import { startReadyCloneExperiments } from './clone-observation';
import { publicationObservationStart } from '../publication-observation';

type Job = typeof assistantJobs.$inferSelect;
const COLLECTION_INTERVAL_MS = 6 * 60 * 60 * 1000;
const activeLease = (job: Job) =>
  and(
    eq(assistantJobs.id, job.id),
    eq(assistantJobs.userId, job.userId),
    eq(assistantJobs.status, 'running'),
    eq(assistantJobs.attempts, job.attempts),
    gt(assistantJobs.leaseUntil, new Date()),
  );
async function renewLease(job: Job) {
  const [current] = await db
    .update(assistantJobs)
    .set({ leaseUntil: new Date(Date.now() + 5 * 60_000) })
    .where(activeLease(job))
    .returning({ id: assistantJobs.id });
  return Boolean(current);
}
async function scheduleNextCollection(
  job: Job,
  executor: Pick<typeof db, 'insert' | 'select'> = db,
) {
  const next = new Date(Date.now() + COLLECTION_INTERVAL_MS);
  const key = `collect:${job.userId}:${Math.floor(next.getTime() / COLLECTION_INTERVAL_MS)}:scheduled`;
  const values = { userId: job.userId, kind: 'collect' as const, runAt: next };
  const [scheduled] = await executor
    .insert(assistantJobs)
    .values({ ...values, deduplicationKey: key })
    .onConflictDoNothing()
    .returning({ id: assistantJobs.id });
  if (scheduled) return;
  const [existing] = await executor
    .select()
    .from(assistantJobs)
    .where(eq(assistantJobs.deduplicationKey, key));
  // Retomar antes do horário não pode usar a própria tarefa como sua próxima execução.
  if (existing && (existing.id === job.id || !['pending', 'running'].includes(existing.status)))
    await executor
      .insert(assistantJobs)
      .values({ ...values, deduplicationKey: `${key}:after:${job.id}` })
      .onConflictDoNothing();
}
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
  keys: PublicationSelection[],
  strategy: 'varied' | 'niche',
  kind: 'initial' | 'expansion' = 'initial',
) {
  if (
    kind === 'initial'
      ? !validateInitialSelection(keys.map((key) => JSON.stringify(key.slice(0, 2))))
      : keys.length < 1 ||
        keys.length > 50 ||
        new Set(keys.map((key) => JSON.stringify(key.slice(0, 2)))).size !== keys.length
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
    for (const [supplierId, sku, expectedOffer] of keys.toSorted((a, b) =>
      JSON.stringify(a.slice(0, 2)).localeCompare(JSON.stringify(b.slice(0, 2))),
    )) {
      const [catalog] = await tx
        .select()
        .from(supplierCatalog)
        .where(and(eq(supplierCatalog.supplierId, supplierId), eq(supplierCatalog.sku, sku)))
        .for('share');
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
        )
        .for('share');
      if (!catalog || !mapping) throw new OperationBlocked('catalog-mapping');
      const product = prepareSupplierProduct(catalog.product, new Date());
      if (product.status !== 'prepared' || !('product' in product))
        throw new OperationBlocked('catalog-stale');
      const payload = publicationPayloadSchema.parse(mapping.payload);
      if (
        publicationOfferFingerprint(payload, {
          userId,
          shopId: shop.shopId,
          applicationId: appId,
        }) !== expectedOffer
      )
        throw new OperationBlocked('offer-changed');
      if (!matchesSupplierOffer(payload, product.product))
        throw new OperationBlocked('catalog-price');
      prepared.push({ supplierId, sku, payload });
    }
    const allSkus = prepared.flatMap((item) => [
      item.sku,
      ...(item.payload.variations?.model.map((model) => model.model_sku) ?? []),
    ]);
    if (new Set(allSkus).size !== allSkus.length) throw new OperationBlocked('selection');
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

/**
 * Quantas vezes uma leitura interrompida (o worker caiu no meio) volta pra fila. Sem teto, uma
 * coleta que derruba o worker voltava na hora pra sempre, e as tarefas das outras alunas esperavam.
 */
export const MAX_INTERRUPTED_ATTEMPTS = 3;

/** Nenhum timeout de escrita volta automaticamente à fila de publicação. */
export async function claimAssistantJob(now = new Date()) {
  return db.transaction(async (tx) => {
    const interrupted = await tx
      .select()
      .from(assistantJobs)
      .where(
        and(
          eq(assistantJobs.status, 'running'),
          eq(assistantJobs.kind, 'publish'),
          lte(assistantJobs.leaseUntil, now),
        ),
      )
      .for('update', { skipLocked: true });
    for (const job of interrupted) {
      const [item] = job.payload.itemId
        ? await tx
            .select()
            .from(assistantPublicationItems)
            .where(
              and(
                eq(assistantPublicationItems.id, job.payload.itemId),
                eq(assistantPublicationItems.userId, job.userId),
              ),
            )
            .for('update')
        : [];
      // Antes de sending não houve escrita externa: só esse caso pode voltar à fila.
      const status =
        item?.status === 'published'
          ? 'completed'
          : item && ['pending', 'failed'].includes(item.status)
            ? 'pending'
            : 'unknown';
      if (item?.status === 'sending')
        await tx
          .update(assistantPublicationItems)
          .set({ status: 'unknown', failure: 'interrupted' })
          .where(eq(assistantPublicationItems.id, item.id));
      await tx
        .update(assistantJobs)
        .set({
          status,
          leaseUntil: null,
          failure: status === 'completed' ? null : 'interrupted',
          ...(status === 'pending' ? { runAt: now } : {}),
        })
        .where(eq(assistantJobs.id, job.id));
    }
    const expiredRead = and(
      eq(assistantJobs.status, 'running'),
      ne(assistantJobs.kind, 'publish'),
      lte(assistantJobs.leaseUntil, now),
    );
    const exhausted = await tx
      .update(assistantJobs)
      .set({ status: 'blocked', leaseUntil: null, failure: 'interrupted' })
      .where(and(expiredRead, gte(assistantJobs.attempts, MAX_INTERRUPTED_ATTEMPTS)))
      .returning();
    // A coleta parada não pode encerrar as próximas: a da vez seguinte continua agendada.
    for (const job of exhausted) if (job.kind === 'collect') await scheduleNextCollection(job, tx);
    await tx
      .update(assistantJobs)
      .set({ status: 'pending', leaseUntil: null })
      .where(and(expiredRead, lt(assistantJobs.attempts, MAX_INTERRUPTED_ATTEMPTS)));
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
    await tx
      .select({ id: assistantJobs.id })
      .from(assistantJobs)
      .where(eq(assistantJobs.deduplicationKey, `publish:${item.id}`))
      .for('update');
    const [batch] = await tx
      .select()
      .from(assistantPublicationBatches)
      .where(eq(assistantPublicationBatches.id, item.batchId))
      .for('update');
    if (!batch) throw new Error('Lote ausente.');
    const [current] = await tx
      .select()
      .from(assistantPublicationItems)
      .where(eq(assistantPublicationItems.id, item.id))
      .for('update');
    if (!current || !['sending', 'unknown', 'published'].includes(current.status))
      throw new OperationBlocked('reconciliation');
    if (current.status === 'published' && current.itemId !== itemId)
      throw new OperationBlocked('reconciliation');
    const now = new Date();
    if (current.status !== 'published')
      await tx
        .update(assistantPublicationItems)
        .set({ status: 'published', itemId, publishedAt: now, failure: null })
        .where(eq(assistantPublicationItems.id, item.id));
    await tx
      .update(assistantJobs)
      .set({ status: 'completed', failure: null, leaseUntil: null })
      .where(eq(assistantJobs.deduplicationKey, `publish:${item.id}`));
    const items = await tx
      .select()
      .from(assistantPublicationItems)
      .where(eq(assistantPublicationItems.batchId, batch.id));
    if (items.every((row) => row.status === 'published') && !batch.publishedAt) {
      await tx
        .update(assistantPublicationBatches)
        .set({ status: batch.kind === 'initial' ? 'observing' : 'published', publishedAt: now })
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

export async function findSku(
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
        shopeeItemListPageSchema,
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
  // Sem item, '' comparado a uma coluna uuid viraria erro do Postgres (22P02) em vez de bloqueio.
  const publicationItemId = job.payload.itemId;
  if (!publicationItemId) throw new OperationBlocked('item');
  const [item] = await db
    .select()
    .from(assistantPublicationItems)
    .where(
      and(
        eq(assistantPublicationItems.id, publicationItemId),
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
    !matchesSupplierOffer(payload, fresh.product)
  )
    throw new OperationBlocked('catalog-stale');
  if (!item.itemId && (await findSku(config, access, payload.item_sku, fetcher)).length)
    throw new OperationBlocked('sku-exists');
  await assertAssistantAccess(job.userId, 'loja-pronta');
  const sending = await db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: assistantJobs.id })
      .from(assistantJobs)
      .where(activeLease(job))
      .for('update');
    if (!owned) throw new OperationBlocked('lease-lost');
    const [connection] = await tx
      .select()
      .from(shopeeConnections)
      .where(eq(shopeeConnections.userId, job.userId))
      .for('share');
    if (!connection || connection.revokedAt || !connectionMatches(access, config, connection))
      throw new OperationBlocked('connection-changed');
    if (process.env.SHOPEE_PUBLICATION_ENABLED !== 'true')
      throw new OperationBlocked('publication-disabled');
    // A busca de SKU pode ser longa. Reconfere o estoque imediatamente antes do envio.
    const [catalogNow] = await tx
      .select()
      .from(supplierCatalog)
      .where(
        and(eq(supplierCatalog.supplierId, item.supplierId), eq(supplierCatalog.sku, item.sku)),
      )
      .for('share');
    const prepared = prepareSupplierProduct(catalogNow?.product, new Date());
    if (
      prepared.status !== 'prepared' ||
      !('product' in prepared) ||
      !matchesSupplierOffer(payload, prepared.product)
    )
      throw new OperationBlocked('catalog-stale');
    const [changed] = await tx
      .update(assistantPublicationItems)
      .set({ status: 'sending', failure: null })
      .where(
        and(
          eq(assistantPublicationItems.id, item.id),
          inArray(assistantPublicationItems.status, ['pending', 'failed']),
        ),
      )
      .returning({ id: assistantPublicationItems.id });
    return changed;
  });
  if (!sending) throw new OperationBlocked('reconciliation');
  let itemId: number;
  try {
    const { variations, sourceImages: _sourceImages, ...basePayload } = payload;
    itemId =
      item.itemId ??
      (
        await addShopeeItem(
          config,
          access,
          { ...basePayload, ...(variations ? { item_status: 'UNLIST' } : {}) },
          fetcher,
        )
      ).item_id;
    if (variations) {
      // O ID da criação é salvo antes da segunda escrita: uma retomada nunca cria outro pai.
      await db
        .update(assistantPublicationItems)
        .set({ itemId })
        .where(eq(assistantPublicationItems.id, item.id));
      await assertAssistantAccess(job.userId, 'loja-pronta');
      if (!(await renewLease(job))) throw new OperationBlocked('lease-lost');
      await publishProductVariations(config, access, itemId, variations, fetcher);
    }
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
  // Só os cinco anúncios do lote: a loja inteira em cada coleta vira centenas de milhares de
  // linhas na memória depois de algumas semanas.
  const snapshots = runs.length
    ? await db
        .select()
        .from(shopeeMetricSnapshots)
        .where(
          and(
            inArray(
              shopeeMetricSnapshots.runId,
              runs.map((run) => run.id),
            ),
            inArray(
              shopeeMetricSnapshots.itemId,
              items.flatMap((item) => (item.itemId ? [item.itemId] : [])),
            ),
          ),
        )
    : [];
  const byRunAndItem = new Map(snapshots.map((row) => [`${row.runId}:${row.itemId}`, row]));
  const samples = runs.map((run) =>
    items.map((item) => {
      const snapshot = byRunAndItem.get(`${run.id}:${item.itemId}`);
      return snapshot ? { ...snapshot, collectedAt: run.startedAt.toISOString() } : undefined;
    }),
  );
  const start = publicationObservationStart(samples);
  const first = runs[start];
  const last = runs.at(-1);
  let analysis: BatchAnalysis = {
    status: 'insufficient',
    message: 'Ainda não há duas coletas completas cobrindo cinco dias para os cinco produtos.',
    items: [],
    preferredCategoryId: null,
    runIds: [],
  };
  if (first && last && last.startedAt.getTime() - first.startedAt.getTime() >= 5 * DAY_MS) {
    const windows = items.map((_, index) =>
      observationSeries(samples.slice(start).map((sample) => sample[index])),
    );
    if (windows.every((window) => window && window.views !== null && window.categoryId !== null)) {
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
  const [saved] = await db
    .update(assistantPublicationBatches)
    .set({
      analysis,
      ...(analysis.status === 'ready' ? { status: 'evaluated' as const, evaluatedAt: now } : {}),
    })
    .where(
      and(
        eq(assistantPublicationBatches.id, batch.id),
        ne(assistantPublicationBatches.status, 'evaluated'),
      ),
    )
    .returning({ analysis: assistantPublicationBatches.analysis });
  if (saved) return saved.analysis;
  const [current] = await db
    .select({ analysis: assistantPublicationBatches.analysis })
    .from(assistantPublicationBatches)
    .where(eq(assistantPublicationBatches.id, batch.id));
  return current?.analysis ?? analysis;
}

// O trabalho de cada tipo de tarefa; 'stale' avisa que outra execução assumiu a tarefa no meio.
async function runJobWork(
  job: Job,
  config: Awaited<ReturnType<typeof assertAssistantAccess>>,
  fetcher: typeof fetch,
): Promise<'stale' | 'done'> {
  if (job.kind === 'collect') {
    const runId = await collectStoreMetrics(job.userId, config, fetcher);
    await startReadyCloneExperiments(job.userId, runId);
    if (!(await renewLease(job))) return 'stale';
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
    await scheduleNextCollection(job);
    return 'done';
  }
  if (job.kind === 'publish') {
    await publishItem(job, fetcher);
    return 'done';
  }
  if (!job.payload.batchId) throw new OperationBlocked('batch');
  await evaluatePublicationBatch(job.userId, job.payload.batchId);
  return 'done';
}

export async function processAssistantJob(job: Job, fetcher: typeof fetch = fetch) {
  const owns = () =>
    and(
      eq(assistantJobs.id, job.id),
      eq(assistantJobs.status, 'running'),
      eq(assistantJobs.attempts, job.attempts),
    );
  const heartbeat = setInterval(() => {
    void renewLease(job).catch(() => {});
  }, 30_000);
  try {
    if (!(await renewLease(job))) return 'stale' as const;
    const config = await assertAssistantAccess(
      job.userId,
      job.kind === 'collect' ? undefined : 'loja-pronta',
    );
    if ((await runJobWork(job, config, fetcher)) === 'stale') return 'stale' as const;
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
    if (reason === 'lease-lost') return 'stale' as const;
    return db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(assistantJobs)
        .where(
          and(
            eq(assistantJobs.id, job.id),
            eq(assistantJobs.attempts, job.attempts),
            inArray(
              assistantJobs.status,
              job.kind === 'publish' ? ['running', 'unknown'] : ['running'],
            ),
          ),
        )
        .for('update');
      if (!current) return 'stale' as const;
      let status = reason === 'uncertain' ? ('unknown' as const) : ('blocked' as const);
      if (job.kind === 'publish' && job.payload.itemId) {
        const [item] = await tx
          .select()
          .from(assistantPublicationItems)
          .where(
            and(
              eq(assistantPublicationItems.id, job.payload.itemId),
              eq(assistantPublicationItems.userId, job.userId),
            ),
          )
          .for('update');
        if (item?.status === 'sending')
          await tx
            .update(assistantPublicationItems)
            .set({ status: 'unknown', failure: 'interrupted' })
            .where(eq(assistantPublicationItems.id, item.id));
        if (item && ['sending', 'unknown'].includes(item.status)) status = 'unknown';
      }
      await tx
        .update(assistantJobs)
        .set({ status, failure: reason, leaseUntil: null })
        .where(eq(assistantJobs.id, job.id));
      if (job.kind === 'collect' && ['unavailable', 'response'].includes(reason))
        await scheduleNextCollection(job, tx);
      return status;
    });
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
  if (item.payload.variations) {
    const models = await readProductModels(config, access, matches[0]!.item_id, fetcher);
    if (!modelsMatchPublication(models, item.payload.variations))
      return { status: 'ambiguous' as const };
  }
  // Finding a SKU in UNLIST or BANNED does not confirm a live listing, even without models.
  const base = await readShopeeResource(
    config,
    access,
    '/api/v2/product/get_item_base_info',
    z.object({ item_list: z.array(z.object({ item_id: z.number(), item_status: z.string() })) }),
    { item_id_list: String(matches[0]!.item_id) },
    fetcher,
  );
  if (
    !base.item_list.some(
      (row) => row.item_id === matches[0]!.item_id && row.item_status === 'NORMAL',
    )
  )
    return { status: 'ambiguous' as const };
  await confirmPublishedItem(item, matches[0]!.item_id);
  await db
    .update(assistantJobs)
    .set({ status: 'completed', failure: null, leaseUntil: null })
    .where(eq(assistantJobs.deduplicationKey, `publish:${item.id}`));
  return { status: 'matched' as const, itemId: matches[0]!.item_id };
}

/** Ativar é idempotente, mas só depois de conferir pai e todas as variações já criadas. */
export async function finishVariationPublication(
  userId: string,
  itemRecordId: string,
  fetcher: typeof fetch = fetch,
) {
  const config = await assertAssistantAccess(userId, 'loja-pronta');
  if (process.env.SHOPEE_PUBLICATION_ENABLED !== 'true') return false;
  const access = await readShopeeAccess(userId, config, fetcher);
  const [item] = await db
    .select()
    .from(assistantPublicationItems)
    .where(
      and(
        eq(assistantPublicationItems.id, itemRecordId),
        eq(assistantPublicationItems.userId, userId),
      ),
    );
  if (
    !item ||
    item.status !== 'unknown' ||
    !item.itemId ||
    !item.payload.variations ||
    !connectionMatches(access, config, item)
  )
    return false;
  const matches = await findSku(config, access, item.payload.item_sku, fetcher);
  if (
    matches.length !== 1 ||
    matches[0]?.item_id !== item.itemId ||
    matches[0].item_name !== item.payload.item_name
  )
    return false;
  const models = await readProductModels(config, access, item.itemId, fetcher);
  if (!modelsMatchPublication(models, item.payload.variations)) return false;
  await assertAssistantAccess(userId, 'loja-pronta');
  await writeShopeeResource(
    config,
    access,
    '/api/v2/product/update_item',
    { item_id: item.itemId, item_status: 'NORMAL' },
    z.object({}),
    fetcher,
  );
  await confirmPublishedItem(item, item.itemId);
  return true;
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
