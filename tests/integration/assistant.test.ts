import {
  publicationOfferFingerprint,
  type PublicationSelection,
} from '@/features/assistant/publication-selection';
import { env } from '@/config/env';
import { generateAssistantAdvice } from '@/features/assistant/server/advice';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/server/db';
import {
  user,
  studentProducts,
  manualProductGrants,
  stores,
  shopeeConnections,
  supplierCatalog,
  supplierPublicationMappings,
  assistantJobs,
  assistantAdvice,
  assistantPublicationBatches,
  assistantPublicationItems,
  assistantPlaybooks,
  assistantPlans,
  assistantPlanProgress,
  shopeeCollectionRuns,
  shopeeMetricSnapshots,
  assistantCategoryExperiments,
} from '@/server/db/schema';
import { shopeeConfigurationSchema, shopeeTokenOwner } from '@/features/shopee/authorization';
import { encryptShopeeToken } from '@/lib/shopee-protocol';
import { readShopeeResource } from '@/features/shopee/server/resources';
import {
  createAssistantPlan,
  publishAssistantPlaybook,
  setAssistantTask,
  hasAssistantLessonReference,
} from '@/features/assistant/server/plans';
import {
  claimAssistantJob,
  MAX_INTERRUPTED_ATTEMPTS,
  processAssistantJob,
  createPublicationBatch,
  evaluatePublicationBatch,
  reconcilePublicationItem,
} from '@/features/assistant/server/operations';
import { collectStoreMetrics, readStoreObservations } from '@/features/assistant/server/metrics';
import { readCategoryExperiments } from '@/features/assistant/server/experiments';
import { starterPlaybooks, publicationPayloadSchema, DAY_MS } from '@/features/assistant/model';
import { buildProductVariations } from '@/features/assistant/supplier-offer';

const ids: string[] = [];
const supplierId = `test-${randomUUID()}`;
const settings = {
  SHOPEE_PARTNER_ID: '123',
  SHOPEE_PARTNER_KEY: 'integration-only',
  SHOPEE_TOKEN_ENCRYPTION_KEY: 'cd'.repeat(32),
  SHOPEE_ENABLED: 'true',
  SHOPEE_PUBLICATION_ENABLED: 'true',
  SHOPEE_ENVIRONMENT: 'live',
  SHOPEE_PILOT_USER_IDS: '',
};
const previous = Object.fromEntries(Object.keys(settings).map((key) => [key, process.env[key]]));
const config = shopeeConfigurationSchema.parse(settings);
let shopId = 8800000;
beforeAll(() => Object.assign(process.env, settings));
afterAll(async () => {
  for (const id of ids) await db.delete(user).where(eq(user.id, id));
  await db.delete(assistantPlaybooks).where(eq(assistantPlaybooks.title, supplierId));
  await db.delete(supplierCatalog).where(eq(supplierCatalog.supplierId, supplierId));
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
  await db.$client.end();
});
async function account(product: 'sll' | 'loja-pronta' = 'loja-pronta') {
  const id = randomUUID();
  ids.push(id);
  const shop = ++shopId;
  await db
    .insert(user)
    .values({ id, email: `${id}@example.invalid`, name: 'Integração', mustChangePassword: false });
  await db.insert(studentProducts).values({ userId: id, product });
  await db.insert(manualProductGrants).values({ userId: id, product });
  await db.insert(stores).values({ userId: id, phase: 5 });
  const owner = shopeeTokenOwner(id, shop, config);
  await db.insert(shopeeConnections).values({
    userId: id,
    shopId: shop,
    applicationId: 'live:123',
    accessTokenEncrypted: encryptShopeeToken(
      'local-access',
      config.SHOPEE_TOKEN_ENCRYPTION_KEY,
      owner,
    ),
    refreshTokenEncrypted: encryptShopeeToken(
      'local-refresh',
      config.SHOPEE_TOKEN_ENCRYPTION_KEY,
      owner,
    ),
    accessTokenExpiresAt: new Date(Date.now() + 3600_000),
  });
  return id;
}
const payload = (sku: string, category = 10) =>
  publicationPayloadSchema.parse({
    item_name: `Produto ${sku}`,
    description: 'Descrição conferida',
    category_id: category,
    item_sku: sku,
    original_price: 20,
    normal_stock: 2,
    weight: 0.2,
    condition: 'NEW',
    item_status: 'NORMAL',
    image: { image_id_list: ['image-id'] },
    dimension: { package_length: 10, package_width: 10, package_height: 10 },
    logistic_info: [{ logistic_id: 1, enabled: true, is_free: false }],
    brand: { brand_id: 0, original_brand_name: 'NoBrand' },
  });
async function catalog(id: string, count = 5) {
  const [connection] = await db
    .select()
    .from(shopeeConnections)
    .where(eq(shopeeConnections.userId, id));
  const keys: PublicationSelection[] = [];
  for (let i = 0; i < count; i++) {
    const sku = `${id}-${i}`;
    keys.push([
      supplierId,
      sku,
      publicationOfferFingerprint(payload(sku, i % 2 ? 20 : 10), {
        userId: id,
        shopId: connection!.shopId,
        applicationId: 'live:123',
      }),
    ]);
    const product = {
      supplierId,
      sku,
      title: `Produto ${sku}`,
      description: 'Descrição real importada',
      images: ['https://example.invalid/image.jpg'],
      costCents: 1000,
      priceCents: 2000,
      stock: 10,
      weightGrams: 200,
      dimensionsCm: { length: 10, width: 10, height: 10 },
      updatedAt: new Date().toISOString(),
      variants: [],
    };
    await db
      .insert(supplierCatalog)
      .values({ supplierId, sku, product, updatedAt: new Date(product.updatedAt) });
    await db.insert(supplierPublicationMappings).values({
      userId: id,
      supplierId,
      sku,
      shopId: connection!.shopId,
      applicationId: 'live:123',
      payload: payload(sku, i % 2 ? 20 : 10),
      confirmedBy: id,
    });
  }
  return keys;
}
const transport = (handler: (url: URL, init: RequestInit) => Response | Promise<Response>) =>
  ((input: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(new URL(String(input)), init ?? {}))) as typeof fetch;
const envelope = (response: unknown) => Response.json({ error: '', response });
const emptyReads = (url: URL) => {
  if (url.pathname.endsWith('get_item_list')) return envelope({ item: [], has_next_page: false });
  throw new Error('Consulta inesperada');
};
async function nextPublish(id: string) {
  // A fila é global; cada teste consome apenas o que criou, deixando leituras futuras fora da janela.
  await db
    .update(assistantJobs)
    .set({ runAt: new Date(Date.now() + DAY_MS) })
    .where(and(eq(assistantJobs.userId, id), eq(assistantJobs.kind, 'collect')));
  return claimAssistantJob();
}

test('planos são versionados, idempotentes e o progresso só pertence à dona', async () => {
  const id = await account('sll');
  const other = await account('sll');
  const reference = randomUUID();
  const book = { ...starterPlaybooks()[0]!, title: supplierId };
  book.actions[0]!.lessonId = reference;
  await publishAssistantPlaybook(book, id, true);
  const [left, right] = await Promise.all([
    createAssistantPlan(id, { storeAge: 'under_7_days', strategy: 'organic' }),
    createAssistantPlan(id, { storeAge: 'under_7_days', strategy: 'organic' }),
  ]);
  expect(left?.id).toBe(right?.id);
  expect(await setAssistantTask(other, left!.id, 'dia-1', true)).toBe(false);
  expect(await setAssistantTask(id, left!.id, 'inventada', true)).toBe(false);
  await setAssistantTask(id, left!.id, 'dia-1', true);
  await setAssistantTask(id, left!.id, 'dia-1', true);
  expect(
    await db.select().from(assistantPlanProgress).where(eq(assistantPlanProgress.planId, left!.id)),
  ).toHaveLength(1);
  await publishAssistantPlaybook(
    { ...book, actions: book.actions.map((row) => ({ ...row, title: 'Versão nova' })) },
    id,
    true,
  );
  expect(
    (await createAssistantPlan(id, { storeAge: 'under_7_days', strategy: 'organic' }))?.actions[0]
      ?.title,
  ).toBe(book.actions[0]!.title);
  expect(await hasAssistantLessonReference(id, reference)).toBe(true);
  expect(await hasAssistantLessonReference(other, reference)).toBe(false);
  await db.update(assistantPlans).set({ active: false }).where(eq(assistantPlans.id, left!.id));
  expect(await hasAssistantLessonReference(id, reference)).toBe(false);
});

test('leituras têm origem fixa, assinatura e erros externos sem tokens', async () => {
  const shop = { shopId: 123, accessToken: 'secret-never-echo' };
  await readShopeeResource(
    config,
    shop,
    '/api/v2/shop/get_shop_info',
    z.object({ shop_name: z.string() }),
    {},
    transport((url, init) => {
      expect(url.origin).toBe('https://partner.shopeemobile.com');
      expect(url.searchParams.get('sign')).toHaveLength(64);
      expect(init.redirect).toBe('error');
      expect(init.cache).toBe('no-store');
      return envelope({ shop_name: 'Loja' });
    }),
  );
  await expect(
    readShopeeResource(
      config,
      shop,
      '/api/v2/shop/get_shop_info',
      z.object({}),
      {},
      transport(() => Response.json({ error: 'bad', message: 'secret-never-echo' })),
    ),
  ).rejects.toThrow('A Shopee não aceitou');
});

test('coleta pagina anúncios e guarda ausência sem zero; coleta parcial nunca vira atual', async () => {
  const id = await account('sll');
  const seen: number[] = [];
  const fetcher = transport((url) => {
    if (url.pathname.endsWith('get_item_list')) {
      const offset = Number(url.searchParams.get('offset'));
      seen.push(offset);
      return envelope(
        offset === 0
          ? { item: [{ item_id: 1 }], has_next_page: true, next_offset: 1 }
          : { item: [{ item_id: 2 }], has_next_page: false },
      );
    }
    if (url.pathname.endsWith('get_item_base_info'))
      return envelope({
        item_list: [
          { item_id: 1, item_name: 'Um', category_id: 10 },
          { item_id: 2, item_name: 'Dois', category_id: 20 },
        ],
      });
    return envelope({ item_list: [{ item_id: 1, views: 0, sale: 0 }, { item_id: 2 }] });
  });
  const runId = await collectStoreMetrics(id, config, fetcher);
  expect(seen).toEqual([0, 1]);
  const rows = await db
    .select()
    .from(shopeeMetricSnapshots)
    .where(eq(shopeeMetricSnapshots.runId, runId));
  expect(rows.find((row) => row.itemId === 1)).toMatchObject({
    views: 0,
    sales: 0,
    clicks: null,
    impressions: null,
  });
  expect(rows.find((row) => row.itemId === 2)?.views).toBeNull();
  await expect(
    collectStoreMetrics(
      id,
      config,
      transport((url) =>
        url.pathname.endsWith('get_item_list')
          ? envelope({ item: [{ item_id: 1 }], has_next_page: false })
          : envelope({ item_list: [] }),
      ),
    ),
  ).rejects.toThrow();
  const data = await readStoreObservations(id);
  expect(data.status).toBe('stale');
  expect(data.items).toHaveLength(2);
  const other = await account('sll');
  expect((await readStoreObservations(other)).items).toEqual([]);
});

test('seleção exige cinco, categoria compatível e catálogo atual; repetição retorna o mesmo lote', async () => {
  const id = await account();
  const keys = await catalog(id);
  await expect(createPublicationBatch(id, keys.slice(1), 'varied')).rejects.toThrow('selection');
  await expect(createPublicationBatch(id, keys, 'niche')).rejects.toThrow('categories');
  const [a, b] = await Promise.all([
    createPublicationBatch(id, keys, 'varied'),
    createPublicationBatch(id, keys, 'varied'),
  ]);
  expect(a).toBe(b);
  expect(
    await db
      .select()
      .from(assistantPublicationItems)
      .where(eq(assistantPublicationItems.batchId, a)),
  ).toHaveLength(5);
  // Não deixa esses jobs interferirem nos próximos testes da fila.
  await db
    .update(assistantJobs)
    .set({ runAt: new Date(Date.now() + DAY_MS) })
    .where(eq(assistantJobs.userId, id));
  const stale = await account();
  const staleKeys = await catalog(stale);
  const [row] = await db
    .select()
    .from(supplierCatalog)
    .where(eq(supplierCatalog.sku, staleKeys[0]![1]));
  await db
    .update(supplierCatalog)
    .set({ product: { ...row!.product, updatedAt: new Date(Date.now() - DAY_MS).toISOString() } })
    .where(eq(supplierCatalog.sku, staleKeys[0]![1]));
  await expect(createPublicationBatch(stale, staleKeys, 'varied')).rejects.toThrow('catalog-stale');
});

test('cinco confirmações iniciam o relógio uma só vez; reprocessar não envia outro anúncio', async () => {
  const id = await account();
  const keys = await catalog(id);
  const batchId = await createPublicationBatch(id, keys, 'varied');
  let writes = 0;
  const fetcher = transport((url) =>
    url.pathname.endsWith('add_item') ? envelope({ item_id: 9000 + ++writes }) : emptyReads(url),
  );
  for (let i = 0; i < 5; i++) {
    const job = await nextPublish(id);
    expect(job?.userId).toBe(id);
    expect(await processAssistantJob(job!, fetcher)).toBe('completed');
    if (i === 0) {
      await processAssistantJob(job!, fetcher);
      expect(writes).toBe(1);
      expect(
        (
          await db
            .select()
            .from(assistantPublicationBatches)
            .where(eq(assistantPublicationBatches.id, batchId))
        )[0]?.publishedAt,
      ).toBeNull();
    }
  }
  const [batch] = await db
    .select()
    .from(assistantPublicationBatches)
    .where(eq(assistantPublicationBatches.id, batchId));
  expect(batch?.status).toBe('observing');
  expect(batch?.publishedAt).toBeInstanceOf(Date);
  expect(writes).toBe(5);
  const [evaluation] = await db
    .select()
    .from(assistantJobs)
    .where(and(eq(assistantJobs.userId, id), eq(assistantJobs.kind, 'evaluate')));
  expect(evaluation!.runAt.getTime() - batch!.publishedAt!.getTime()).toBe(5 * DAY_MS);
  await db
    .update(assistantJobs)
    .set({ runAt: new Date(Date.now() + 10 * DAY_MS) })
    .where(eq(assistantJobs.userId, id));
});

test('timeout de publicação não reenvia; conciliação recupera o último anúncio e o relógio', async () => {
  const id = await account();
  const keys = await catalog(id);
  const batchId = await createPublicationBatch(id, keys, 'varied');
  const items = await db
    .select()
    .from(assistantPublicationItems)
    .where(eq(assistantPublicationItems.batchId, batchId));
  const target = items[0]!;
  for (const [index, item] of items.slice(1).entries()) {
    await db
      .update(assistantPublicationItems)
      .set({ status: 'published', itemId: 7100 + index, publishedAt: new Date() })
      .where(eq(assistantPublicationItems.id, item.id));
    await db
      .update(assistantJobs)
      .set({ status: 'completed' })
      .where(eq(assistantJobs.deduplicationKey, `publish:${item.id}`));
  }
  const job = await claimAssistantJob();
  let writes = 0;
  expect(
    await processAssistantJob(
      job!,
      transport((url) => {
        if (url.pathname.endsWith('add_item')) {
          writes++;
          throw new Error('timeout');
        }
        return emptyReads(url);
      }),
    ),
  ).toBe('unknown');
  expect(
    (
      await db
        .select()
        .from(assistantPublicationItems)
        .where(eq(assistantPublicationItems.id, target.id))
    )[0]?.status,
  ).toBe('unknown');
  expect(await claimAssistantJob()).toBeNull();
  expect(writes).toBe(1);
  const result = await reconcilePublicationItem(
    id,
    target.id,
    transport((url) =>
      url.pathname.endsWith('get_item_list')
        ? envelope({
            item: url.searchParams.get('item_status') === 'NORMAL' ? [{ item_id: 9999 }] : [],
            has_next_page: false,
          })
        : envelope({
            item_list: [
              { item_id: 9999, item_sku: target.sku, item_name: target.payload.item_name },
            ],
          }),
    ),
  );
  expect(result.status).toBe('matched');
  expect(
    (
      await db
        .select()
        .from(assistantPublicationBatches)
        .where(eq(assistantPublicationBatches.id, batchId))
    )[0]?.status,
  ).toBe('observing');
  await db
    .update(assistantJobs)
    .set({ runAt: new Date(Date.now() + 10 * DAY_MS) })
    .where(eq(assistantJobs.userId, id));
});

test('reinício de worker marca escrita como incerta e recupera somente leituras', async () => {
  const id = await account();
  const past = new Date(Date.now() - 1000);
  await db.insert(assistantJobs).values([
    {
      userId: id,
      kind: 'publish',
      deduplicationKey: randomUUID(),
      status: 'running',
      leaseUntil: past,
      runAt: past,
    },
    {
      userId: id,
      kind: 'collect',
      deduplicationKey: randomUUID(),
      status: 'running',
      leaseUntil: past,
      runAt: past,
    },
  ]);
  const claimed = await claimAssistantJob();
  expect(claimed?.kind).toBe('collect');
  expect(claimed?.attempts).toBe(1);
  expect(
    (
      await db
        .select()
        .from(assistantJobs)
        .where(and(eq(assistantJobs.userId, id), eq(assistantJobs.kind, 'publish')))
    )[0]?.status,
  ).toBe('unknown');
  await db.update(assistantJobs).set({ status: 'completed' }).where(eq(assistantJobs.userId, id));
});

test('leitura interrompida volta à fila só até o teto de tentativas', async () => {
  const id = await account();
  const past = new Date(Date.now() - 1000);
  const [job] = await db
    .insert(assistantJobs)
    .values({
      userId: id,
      kind: 'collect',
      deduplicationKey: randomUUID(),
      status: 'running',
      attempts: MAX_INTERRUPTED_ATTEMPTS - 1,
      leaseUntil: past,
      runAt: past,
    })
    .returning();
  // Uma a menos que o teto: volta pra fila e é pega de novo.
  const retried = await claimAssistantJob();
  expect(retried?.id).toBe(job!.id);
  expect(retried?.attempts).toBe(MAX_INTERRUPTED_ATTEMPTS);
  await db.update(assistantJobs).set({ leaseUntil: past }).where(eq(assistantJobs.id, job!.id));
  // No teto: para como bloqueada e a próxima coleta fica agendada.
  expect((await claimAssistantJob())?.id).not.toBe(job!.id);
  const rows = await db.select().from(assistantJobs).where(eq(assistantJobs.userId, id));
  const stopped = rows.find((row) => row.id === job!.id);
  expect(stopped?.status).toBe('blocked');
  expect(stopped?.failure).toBe('interrupted');
  const next = rows.find((row) => row.id !== job!.id && row.kind === 'collect');
  expect(next?.status).toBe('pending');
  expect(next!.runAt.getTime()).toBeGreaterThan(Date.now());
  await db.update(assistantJobs).set({ status: 'completed' }).where(eq(assistantJobs.userId, id));
});

test('avaliação exige cinco dias de dados completos e comparação pertence à dona', async () => {
  const id = await account();
  const keys = await catalog(id);
  const batchId = await createPublicationBatch(id, keys, 'varied');
  await db.update(assistantJobs).set({ status: 'completed' }).where(eq(assistantJobs.userId, id));
  const started = new Date(Date.now() - 6 * DAY_MS);
  await db
    .update(assistantPublicationBatches)
    .set({ status: 'observing', publishedAt: started })
    .where(eq(assistantPublicationBatches.id, batchId));
  const items = await db
    .select()
    .from(assistantPublicationItems)
    .where(eq(assistantPublicationItems.batchId, batchId));
  for (const [index, item] of items.entries())
    await db
      .update(assistantPublicationItems)
      .set({ status: 'published', itemId: 8000 + index, publishedAt: started })
      .where(eq(assistantPublicationItems.id, item.id));
  expect((await evaluatePublicationBatch(id, batchId))?.status).toBe('insufficient');
  const [connection] = await db
    .select()
    .from(shopeeConnections)
    .where(eq(shopeeConnections.userId, id));
  const runs = [];
  for (const [index, time] of [started, new Date(started.getTime() + 5 * DAY_MS)].entries()) {
    const [run] = await db
      .insert(shopeeCollectionRuns)
      .values({
        userId: id,
        shopId: connection!.shopId,
        applicationId: 'live:123',
        status: 'completed',
        startedAt: time,
        completedAt: time,
      })
      .returning();
    runs.push(run!);
    await db.insert(shopeeMetricSnapshots).values(
      items.map((item, i) => ({
        runId: run!.id,
        itemId: 8000 + i,
        title: item.payload.item_name,
        categoryId: item.payload.category_id,
        views: index ? 200 + i * 10 : 0,
        sales: 0,
      })),
    );
  }
  expect((await evaluatePublicationBatch(id, batchId))?.status).toBe('ready');
  await db.insert(assistantCategoryExperiments).values({
    userId: id,
    shopId: connection!.shopId,
    applicationId: 'live:123',
    leftItemId: 8000,
    rightItemId: 8001,
    baselineRunId: runs[0]!.id,
  });
  expect((await readCategoryExperiments(id))[0]?.result.status).toBe('compared');
  const other = await account('sll');
  expect(await readCategoryExperiments(other)).toEqual([]);
  await expect(evaluatePublicationBatch(other, batchId)).rejects.toThrow('batch');
  // A troca de categoria no meio invalida, mesmo se a categoria final voltar à original.
  const [middle] = await db
    .insert(shopeeCollectionRuns)
    .values({
      userId: id,
      shopId: connection!.shopId,
      applicationId: 'live:123',
      status: 'completed',
      startedAt: new Date(started.getTime() + DAY_MS),
    })
    .returning();
  await db.insert(shopeeMetricSnapshots).values([
    { runId: middle!.id, itemId: 8000, title: 'Alterado', categoryId: 55, views: 100 },
    { runId: middle!.id, itemId: 8001, title: 'Dois', categoryId: 20, views: 100 },
  ]);
  expect((await readCategoryExperiments(id))[0]?.result.status).toBe('incomparable');
});

test('SKU existente e acesso revogado impedem a escrita externa', async () => {
  const id = await account();
  const keys = await catalog(id);
  const batchId = await createPublicationBatch(id, keys, 'varied');
  const job = await claimAssistantJob();
  let writes = 0;
  const item = (
    await db
      .select()
      .from(assistantPublicationItems)
      .where(eq(assistantPublicationItems.id, job!.payload.itemId!))
  )[0]!;
  const existing = transport((url) => {
    if (url.pathname.endsWith('add_item')) {
      writes++;
      return envelope({ item_id: 1 });
    }
    if (url.pathname.endsWith('get_item_list'))
      return envelope({ item: [{ item_id: 123 }], has_next_page: false });
    return envelope({
      item_list: [{ item_id: 123, item_sku: item.sku, item_name: item.payload.item_name }],
    });
  });
  expect(await processAssistantJob(job!, existing)).toBe('blocked');
  expect(writes).toBe(0);
  await db.delete(studentProducts).where(eq(studentProducts.userId, id));
  const next = await claimAssistantJob();
  let calls = 0;
  expect(
    await processAssistantJob(
      next!,
      transport(() => {
        calls++;
        return envelope({});
      }),
    ),
  ).toBe('blocked');
  expect(calls).toBe(0);
  expect(
    (
      await db
        .select()
        .from(assistantPublicationBatches)
        .where(eq(assistantPublicationBatches.id, batchId))
    )[0]?.publishedAt,
  ).toBeNull();
  await db.update(assistantJobs).set({ status: 'completed' }).where(eq(assistantJobs.userId, id));
});

test('IA reserva uma chamada por coleta, rejeita IDs inventados e limita três tentativas em 24h', async () => {
  const previousKey = env.OPENAI_API_KEY;
  env.OPENAI_API_KEY = 'integration-only';
  try {
    const id = await account('sll');
    const [connection] = await db
      .select()
      .from(shopeeConnections)
      .where(eq(shopeeConnections.userId, id));
    let calls = 0;
    const response = transport(() => {
      calls++;
      return Response.json({
        id: 'resp_integration',
        object: 'response',
        status: 'completed',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({ priorities: [{ action: 'review-offer', itemId: 999999 }] }),
                annotations: [],
              },
            ],
          },
        ],
      });
    });
    for (let index = 0; index < 4; index++) {
      const [run] = await db
        .insert(shopeeCollectionRuns)
        .values({
          userId: id,
          shopId: connection!.shopId,
          applicationId: 'live:123',
          status: 'completed',
          startedAt: new Date(Date.now() - 10000 + index * 1000),
        })
        .returning();
      await db.insert(shopeeMetricSnapshots).values({
        runId: run!.id,
        itemId: 1,
        title: 'Produto',
        categoryId: 10,
        views: 100 + index * 10,
        sales: 0,
      });
      const results = await Promise.all([
        generateAssistantAdvice(id, response),
        generateAssistantAdvice(id, response),
      ]);
      if (index < 3) {
        expect(results).toContain('unavailable');
        continue;
      }
      expect(results).toEqual(['limited', 'limited']);
    }
    expect(calls).toBe(3);
    const attempts = await db.select().from(assistantAdvice).where(eq(assistantAdvice.userId, id));
    expect(attempts).toHaveLength(3);
    expect(attempts.every((row) => row.status === 'failed')).toBe(true);
  } finally {
    env.OPENAI_API_KEY = previousKey;
  }
});

test('uma orientação válida fica salva e não faz nova chamada ao ser solicitada novamente', async () => {
  const previousKey = env.OPENAI_API_KEY;
  env.OPENAI_API_KEY = 'integration-only';
  try {
    const id = await account('sll');
    const [connection] = await db
      .select()
      .from(shopeeConnections)
      .where(eq(shopeeConnections.userId, id));
    const [run] = await db
      .insert(shopeeCollectionRuns)
      .values({
        userId: id,
        shopId: connection!.shopId,
        applicationId: 'live:123',
        status: 'completed',
      })
      .returning();
    await db.insert(shopeeMetricSnapshots).values({
      runId: run!.id,
      itemId: 1,
      title: 'Produto',
      categoryId: 10,
      views: 100,
      sales: 0,
    });
    let calls = 0;
    const fetcher = transport(() => {
      calls++;
      return Response.json({
        id: 'resp_test_valid',
        object: 'response',
        status: 'completed',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({ priorities: [{ action: 'collect-period', itemId: null }] }),
                annotations: [],
              },
            ],
          },
        ],
      });
    });
    expect(await generateAssistantAdvice(id, fetcher)).toBe('ready');
    expect(await generateAssistantAdvice(id, fetcher)).toBe('ready');
    expect(calls).toBe(1);
    const [advice] = await db.select().from(assistantAdvice).where(eq(assistantAdvice.userId, id));
    expect(advice?.priorities).toEqual([{ action: 'collect-period', itemId: null }]);
  } finally {
    env.OPENAI_API_KEY = previousKey;
  }
});

test('preço alterado exige nova confirmação da dona e nunca reautoriza resultado incerto', async () => {
  const { publicationCorrections, reauthorizePublicationItem } =
    await import('@/features/assistant/server/corrections');
  const id = await account();
  const other = await account();
  const keys = await catalog(id);
  const batchId = await createPublicationBatch(id, keys, 'varied');
  const [item] = await db
    .select()
    .from(assistantPublicationItems)
    .where(eq(assistantPublicationItems.batchId, batchId));
  await db
    .update(assistantJobs)
    .set({ status: 'blocked' })
    .where(eq(assistantJobs.deduplicationKey, `publish:${item!.id}`));
  const [source] = await db
    .select()
    .from(supplierCatalog)
    .where(eq(supplierCatalog.sku, item!.sku));
  await db
    .update(supplierCatalog)
    .set({ product: { ...source!.product, priceCents: 2500 } })
    .where(eq(supplierCatalog.sku, item!.sku));
  await db
    .update(supplierPublicationMappings)
    .set({ payload: { ...item!.payload, original_price: 25 } })
    .where(eq(supplierPublicationMappings.sku, item!.sku));
  const [correction] = await publicationCorrections(id);
  expect(correction).toMatchObject({ previousPrice: 20, price: 25 });
  expect(await publicationCorrections(other)).toEqual([]);
  expect(await reauthorizePublicationItem(other, item!.id, correction!.fingerprint)).toBe(false);
  expect(await reauthorizePublicationItem(id, item!.id, '0'.repeat(64))).toBe(false);
  expect(await reauthorizePublicationItem(id, item!.id, correction!.fingerprint)).toBe(true);
  expect(await reauthorizePublicationItem(id, item!.id, correction!.fingerprint)).toBe(false);
  expect(
    (
      await db
        .select()
        .from(assistantPublicationItems)
        .where(eq(assistantPublicationItems.id, item!.id))
    )[0]?.payload.original_price,
  ).toBe(25);
  await db
    .update(assistantPublicationItems)
    .set({ status: 'unknown' })
    .where(eq(assistantPublicationItems.id, item!.id));
  await db
    .update(assistantJobs)
    .set({ status: 'blocked' })
    .where(eq(assistantJobs.deduplicationKey, `publish:${item!.id}`));
  expect(await reauthorizePublicationItem(id, item!.id, correction!.fingerprint)).toBe(false);
  await db.update(assistantJobs).set({ status: 'completed' }).where(eq(assistantJobs.userId, id));
});

test('a seleção inicial exige a oferta exibida, mesmo se o fornecedor e o mapeamento já mudaram juntos', async () => {
  const { availableSupplierProducts } = await import('@/features/assistant/server/catalog');
  const id = await account();
  const keys = await catalog(id);
  const sku = keys[0]![1];
  const [source] = await db.select().from(supplierCatalog).where(eq(supplierCatalog.sku, sku));
  const [mapping] = await db
    .select()
    .from(supplierPublicationMappings)
    .where(eq(supplierPublicationMappings.sku, sku));
  await db
    .update(supplierCatalog)
    .set({ product: { ...source!.product, priceCents: 2500 } })
    .where(eq(supplierCatalog.sku, sku));
  await db
    .update(supplierPublicationMappings)
    .set({ payload: { ...mapping!.payload, original_price: 25 } })
    .where(eq(supplierPublicationMappings.sku, sku));
  await expect(createPublicationBatch(id, keys, 'varied')).rejects.toThrow('offer-changed');
  expect(
    await db
      .select()
      .from(assistantPublicationBatches)
      .where(eq(assistantPublicationBatches.userId, id)),
  ).toHaveLength(0);
  const refreshed = await availableSupplierProducts(id, 'user');
  const selections = refreshed.products.map(
    (product) => [product.supplierId, product.sku, product.fingerprint] as PublicationSelection,
  );
  const batchId = await createPublicationBatch(id, selections, 'varied');
  expect(
    (
      await db
        .select()
        .from(assistantPublicationItems)
        .where(
          and(
            eq(assistantPublicationItems.batchId, batchId),
            eq(assistantPublicationItems.sku, sku),
          ),
        )
    )[0]?.payload.original_price,
  ).toBe(25);
  await db.update(assistantJobs).set({ status: 'completed' }).where(eq(assistantJobs.userId, id));
});

test('estoque alterado durante a busca de SKUs é conferido antes da escrita', async () => {
  const id = await account();
  const keys = await catalog(id);
  await createPublicationBatch(id, keys, 'varied');
  const job = await claimAssistantJob();
  const [item] = await db
    .select()
    .from(assistantPublicationItems)
    .where(eq(assistantPublicationItems.id, job!.payload.itemId!));
  let writes = 0;
  let changed = false;
  const fetcher = transport(async (url) => {
    if (url.pathname.endsWith('add_item')) {
      writes++;
      return envelope({ item_id: 123 });
    }
    if (!changed) {
      changed = true;
      const [source] = await db
        .select()
        .from(supplierCatalog)
        .where(eq(supplierCatalog.sku, item!.sku));
      await db
        .update(supplierCatalog)
        .set({ product: { ...source!.product, stock: 0 } })
        .where(eq(supplierCatalog.sku, item!.sku));
    }
    return emptyReads(url);
  });
  expect(await processAssistantJob(job!, fetcher)).toBe('blocked');
  expect(writes).toBe(0);
  expect(
    (
      await db
        .select()
        .from(assistantPublicationItems)
        .where(eq(assistantPublicationItems.id, item!.id))
    )[0]?.status,
  ).toBe('pending');
  await db.update(assistantJobs).set({ status: 'completed' }).where(eq(assistantJobs.userId, id));
});

test('worker antigo não envia depois que uma publicação ainda não iniciada é retomada', async () => {
  const id = await account();
  const keys = await catalog(id);
  await createPublicationBatch(id, keys, 'varied');
  const original = await claimAssistantJob();
  await db
    .update(assistantJobs)
    .set({ runAt: new Date(Date.now() + DAY_MS) })
    .where(eq(assistantJobs.userId, id));
  let replacement: Awaited<ReturnType<typeof claimAssistantJob>> = null;
  let writes = 0;
  let interrupted = false;
  const fetcher = transport(async (url) => {
    if (url.pathname.endsWith('add_item')) {
      writes++;
      return envelope({ item_id: 12345 });
    }
    if (!interrupted) {
      interrupted = true;
      await db
        .update(assistantJobs)
        .set({ leaseUntil: new Date(Date.now() - 1000) })
        .where(eq(assistantJobs.id, original!.id));
      replacement = await claimAssistantJob();
    }
    return emptyReads(url);
  });
  expect(await processAssistantJob(original!, fetcher)).toBe('stale');
  expect(writes).toBe(0);
  expect(replacement!.id).toBe(original!.id);
  expect(replacement!.attempts).toBe(original!.attempts + 1);
  expect(
    (await db.select().from(assistantJobs).where(eq(assistantJobs.id, original!.id)))[0]?.status,
  ).toBe('running');
  expect(await processAssistantJob(replacement!, fetcher)).toBe('completed');
  expect(writes).toBe(1);
  await db.update(assistantJobs).set({ status: 'completed' }).where(eq(assistantJobs.userId, id));
});

test('a resposta aceita após a expiração é persistida sem deixar um job incerto órfão', async () => {
  const id = await account();
  const keys = await catalog(id);
  await createPublicationBatch(id, keys, 'varied');
  const job = await claimAssistantJob();
  await db
    .update(assistantJobs)
    .set({ runAt: new Date(Date.now() + DAY_MS) })
    .where(eq(assistantJobs.userId, id));
  const fetcher = transport(async (url) => {
    if (!url.pathname.endsWith('add_item')) return emptyReads(url);
    await db
      .update(assistantJobs)
      .set({ leaseUntil: new Date(Date.now() - 1000) })
      .where(eq(assistantJobs.id, job!.id));
    expect(await claimAssistantJob()).toBeNull();
    return envelope({ item_id: 56789 });
  });
  expect(await processAssistantJob(job!, fetcher)).toBe('completed');
  expect(
    (await db.select().from(assistantJobs).where(eq(assistantJobs.id, job!.id)))[0]?.status,
  ).toBe('completed');
  expect(
    (
      await db
        .select()
        .from(assistantPublicationItems)
        .where(eq(assistantPublicationItems.id, job!.payload.itemId!))
    )[0],
  ).toMatchObject({ status: 'published', itemId: 56789 });
  await db.update(assistantJobs).set({ status: 'completed' }).where(eq(assistantJobs.userId, id));
});

test('uma falha temporária mantém a próxima coleta e o agendamento não contorna acesso removido', async () => {
  const id = await account('sll');
  await db.insert(assistantJobs).values({
    userId: id,
    kind: 'collect',
    deduplicationKey: randomUUID(),
    runAt: new Date(Date.now() - 1000),
  });
  const job = await claimAssistantJob();
  expect(
    await processAssistantJob(
      job!,
      transport(() => {
        throw new Error('timeout');
      }),
    ),
  ).toBe('blocked');
  const [next] = await db
    .select()
    .from(assistantJobs)
    .where(and(eq(assistantJobs.userId, id), eq(assistantJobs.status, 'pending')));
  expect(next?.kind).toBe('collect');
  expect(next!.runAt.getTime()).toBeGreaterThan(Date.now() + 5 * 60 * 60 * 1000);
  await db.update(assistantJobs).set({ runAt: new Date() }).where(eq(assistantJobs.id, next!.id));
  const retry = await claimAssistantJob();
  expect(await processAssistantJob(retry!, transport(emptyReads))).toBe('completed');
  const [last] = await db
    .select()
    .from(assistantJobs)
    .where(and(eq(assistantJobs.userId, id), eq(assistantJobs.status, 'pending')));
  await db.delete(studentProducts).where(eq(studentProducts.userId, id));
  await db.update(assistantJobs).set({ runAt: new Date() }).where(eq(assistantJobs.id, last!.id));
  const revoked = await claimAssistantJob();
  let calls = 0;
  expect(
    await processAssistantJob(
      revoked!,
      transport(() => {
        calls++;
        return envelope({});
      }),
    ),
  ).toBe('blocked');
  expect(calls).toBe(0);
  expect(
    await db
      .select()
      .from(assistantJobs)
      .where(and(eq(assistantJobs.userId, id), eq(assistantJobs.status, 'pending'))),
  ).toHaveLength(0);
});

test('lote seguinte termina publicado sem aguardar uma análise que só existe para o lote inicial', async () => {
  const id = await account();
  const keys = await catalog(id, 6);
  const initialId = await createPublicationBatch(id, keys.slice(0, 5), 'varied');
  await db.update(assistantJobs).set({ status: 'completed' }).where(eq(assistantJobs.userId, id));
  await db
    .update(assistantPublicationBatches)
    .set({ status: 'evaluated', publishedAt: new Date(Date.now() - 6 * DAY_MS) })
    .where(eq(assistantPublicationBatches.id, initialId));
  const expansionId = await createPublicationBatch(id, [keys[5]!], 'niche', 'expansion');
  const job = await claimAssistantJob();
  expect(
    await processAssistantJob(
      job!,
      transport((url) =>
        url.pathname.endsWith('add_item') ? envelope({ item_id: 998877 }) : emptyReads(url),
      ),
    ),
  ).toBe('completed');
  const [batch] = await db
    .select()
    .from(assistantPublicationBatches)
    .where(eq(assistantPublicationBatches.id, expansionId));
  expect(batch?.status).toBe('published');
  expect(batch?.publishedAt).toBeInstanceOf(Date);
  expect(
    await db
      .select()
      .from(assistantJobs)
      .where(and(eq(assistantJobs.userId, id), eq(assistantJobs.kind, 'evaluate'))),
  ).toHaveLength(0);
  await db.update(assistantJobs).set({ status: 'completed' }).where(eq(assistantJobs.userId, id));
});

test('uma resposta perdida nas variações conserva o ID do pai e não cria outro anúncio', async () => {
  const id = await account();
  const keys = await catalog(id);
  const sku = keys[0]![1];
  const [source] = await db.select().from(supplierCatalog).where(eq(supplierCatalog.sku, sku));
  const product = {
    ...source!.product,
    variants: [
      { sku: `${sku}-p`, options: { Tamanho: 'P' }, costCents: 1000, priceCents: 2000, stock: 2 },
    ],
  };
  const mapped = { ...payload(sku), variations: buildProductVariations(product) };
  const [connection] = await db
    .select()
    .from(shopeeConnections)
    .where(eq(shopeeConnections.userId, id));
  await db.update(supplierCatalog).set({ product }).where(eq(supplierCatalog.sku, sku));
  await db
    .update(supplierPublicationMappings)
    .set({ payload: mapped })
    .where(
      and(eq(supplierPublicationMappings.userId, id), eq(supplierPublicationMappings.sku, sku)),
    );
  keys[0]![2] = publicationOfferFingerprint(mapped, {
    userId: id,
    shopId: connection!.shopId,
    applicationId: 'live:123',
  });
  await createPublicationBatch(id, keys, 'varied');
  await db
    .update(assistantJobs)
    .set({ runAt: new Date(Date.now() + DAY_MS) })
    .where(eq(assistantJobs.userId, id));
  const [item] = await db
    .select()
    .from(assistantPublicationItems)
    .where(and(eq(assistantPublicationItems.userId, id), eq(assistantPublicationItems.sku, sku)));
  const [job] = await db
    .update(assistantJobs)
    .set({ status: 'running', attempts: 1, leaseUntil: new Date(Date.now() + 300_000) })
    .where(eq(assistantJobs.deduplicationKey, `publish:${item!.id}`))
    .returning();
  let parents = 0;
  let modelWrites = 0;
  const fetcher = transport((url, init) => {
    if (url.pathname.endsWith('add_item')) {
      parents++;
      const sent = JSON.parse(String(init.body));
      expect(sent.variations).toBeUndefined();
      expect(sent.sourceImages).toBeUndefined();
      expect(sent.item_status).toBe('UNLIST');
      return envelope({ item_id: 99001 });
    }
    if (url.pathname.endsWith('get_model_list')) return envelope({ tier_variation: [], model: [] });
    if (url.pathname.endsWith('init_tier_variation')) {
      modelWrites++;
      throw new Error('Resposta perdida');
    }
    return emptyReads(url);
  });
  expect(await processAssistantJob(job!, fetcher)).toBe('unknown');
  const [uncertain] = await db
    .select()
    .from(assistantPublicationItems)
    .where(eq(assistantPublicationItems.id, item!.id));
  expect(uncertain?.itemId).toBe(99001);
  expect(uncertain?.status).toBe('unknown');
  await processAssistantJob(job!, fetcher);
  expect(parents).toBe(1);
  expect(modelWrites).toBe(1);
  const resolved = transport((url) => {
    if (url.pathname.endsWith('get_item_list'))
      return envelope({
        item: url.searchParams.get('item_status') === 'NORMAL' ? [{ item_id: 99001 }] : [],
        has_next_page: false,
      });
    if (url.pathname.endsWith('get_item_base_info'))
      return envelope({
        item_list: [
          { item_id: 99001, item_sku: sku, item_name: mapped.item_name, item_status: 'NORMAL' },
        ],
      });
    if (url.pathname.endsWith('get_model_list'))
      return envelope({
        tier_variation: mapped.variations!.tier_variation,
        model: [
          {
            model_sku: `${sku}-p`,
            tier_index: [0],
            price_info: [{ original_price: 20 }],
            stock_info_v2: { summary_info: { total_available_stock: 2 } },
          },
        ],
      });
    throw new Error('A conciliação não deve escrever');
  });
  expect((await reconcilePublicationItem(id, item!.id, resolved)).status).toBe('matched');
  expect(parents).toBe(1);
});
