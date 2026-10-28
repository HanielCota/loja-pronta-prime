import sharp from 'sharp';
import { brandFingerprint } from '@/features/brand/server/fingerprint';
import { queueAutomaticBrands, queueApprovedBrand } from '@/features/brand/server/publication';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  user,
  studentProducts,
  manualProductGrants,
  shopeeConnections,
  storeAutomationJobs,
  storeBrand,
  runtimeHeartbeats,
  supplierFeedSubscriptions,
  supplierCatalog,
  supplierPublicationMappings,
  shopeeCollectionRuns,
  shopeeMetricSnapshots,
  assistantCategoryExperiments,
  assistantPlaybooks,
} from '@/server/db/schema';
import { shopeeConfigurationSchema, shopeeTokenOwner } from '@/features/shopee/authorization';
import { encryptShopeeToken } from '@/lib/shopee-protocol';
import {
  queueStoreChange,
  processStoreChange,
  reconcileStoreChange,
  finishClonedVariations,
} from '@/features/assistant/server/store-changes';
import { hasHealthyAssistantWorker } from '@/server/runtime-health';
import { syncSupplierFeeds } from '@/features/assistant/server/supplier-sync';
import { publicationPayloadSchema } from '@/features/assistant/model';
import { readCloneOffer, newCloneTemplate } from '@/features/assistant/server/listing-clones';
import { startReadyCloneExperiments } from '@/features/assistant/server/clone-observation';
import { ensureInitialAssistantPlaybooks } from '@/features/assistant/server/initial-playbooks';
import { readCategoryExperiments } from '@/features/assistant/server/experiments';

const settings = {
  SHOPEE_PARTNER_ID: '123',
  SHOPEE_PARTNER_KEY: 'integration-only',
  SHOPEE_TOKEN_ENCRYPTION_KEY: 'cd'.repeat(32),
  SHOPEE_ENABLED: 'true',
  SHOPEE_PUBLICATION_ENABLED: 'true',
  SHOPEE_BRAND_PUBLICATION_ENABLED: 'true',
  SHOPEE_ENVIRONMENT: 'live',
  SHOPEE_PILOT_USER_IDS: '',
};
const previous = Object.fromEntries(Object.keys(settings).map((key) => [key, process.env[key]]));
const ids: string[] = [];
const config = shopeeConfigurationSchema.parse(settings);
let shopId = 9900000;
beforeAll(() => Object.assign(process.env, settings));
afterAll(async () => {
  for (const id of ids) await db.delete(user).where(eq(user.id, id));
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
  await db.$client.end();
});
async function account() {
  const id = randomUUID();
  ids.push(id);
  const shop = ++shopId;
  await db
    .insert(user)
    .values({ id, email: `${id}@example.invalid`, name: 'Teste', mustChangePassword: false });
  await db.insert(studentProducts).values([
    { userId: id, product: 'sll' },
    { userId: id, product: 'loja-pronta' },
  ]);
  await db.insert(manualProductGrants).values([
    { userId: id, product: 'sll' },
    { userId: id, product: 'loja-pronta' },
  ]);
  const owner = shopeeTokenOwner(id, shop, config);
  await db.insert(shopeeConnections).values({
    userId: id,
    shopId: shop,
    applicationId: 'live:123',
    accessTokenEncrypted: encryptShopeeToken(
      'test-access',
      config.SHOPEE_TOKEN_ENCRYPTION_KEY,
      owner,
    ),
    refreshTokenEncrypted: encryptShopeeToken(
      'test-refresh',
      config.SHOPEE_TOKEN_ENCRYPTION_KEY,
      owner,
    ),
    accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
  });
  return id;
}
const transport = (handler: (url: URL, init: RequestInit) => Response | Promise<Response>) =>
  ((input: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(new URL(String(input)), init ?? {}))) as typeof fetch;
const envelope = (response: unknown) => Response.json({ error: '', response });

test('timeout de perfil não é reenviado e a conciliação consulta o valor efetivo', async () => {
  const id = await account();
  const payload = {
    shop_name: 'Minha loja',
    description: 'Descrição da loja',
    shop_logo: 'https://images.example.com/logo.jpg',
  };
  const jobId = await queueStoreChange(id, 'brand', payload);
  expect(await queueStoreChange(id, 'brand', payload)).toBe(jobId);
  let writes = 0;
  await processStoreChange(
    transport((url) => {
      if (url.pathname.endsWith('get_profile')) return envelope({ shop_name: 'Antigo' });
      writes++;
      throw new Error('Resposta perdida');
    }),
  );
  const [unknown] = await db
    .select()
    .from(storeAutomationJobs)
    .where(eq(storeAutomationJobs.id, jobId));
  expect(unknown?.status).toBe('unknown');
  expect(writes).toBe(1);
  expect(
    await processStoreChange(
      transport(() => {
        throw new Error('Não deve chamar');
      }),
    ),
  ).toBe(false);
  expect(
    await reconcileStoreChange(
      id,
      jobId,
      transport(() => envelope({ shop_name: 'Outro' })),
    ),
  ).toBe(false);
  expect(
    await reconcileStoreChange(
      id,
      jobId,
      transport(() => envelope(payload)),
    ),
  ).toBe(true);
  expect(writes).toBe(1);
});
test('revogação depois da confirmação impede qualquer escrita', async () => {
  const id = await account();
  const jobId = await queueStoreChange(id, 'edit', { item_id: 55, item_name: 'Novo título' });
  await db
    .delete(studentProducts)
    .where(and(eq(studentProducts.userId, id), eq(studentProducts.product, 'sll')));
  let requests = 0;
  await processStoreChange(
    transport(() => {
      requests++;
      return envelope({});
    }),
  );
  const [job] = await db
    .select()
    .from(storeAutomationJobs)
    .where(eq(storeAutomationJobs.id, jobId));
  expect(job?.status).toBe('blocked');
  expect(requests).toBe(0);
});
test('categoria incompatível bloqueia a tarefa e conserva a configuração anterior', async () => {
  const id = await account();
  const jobId = await queueStoreChange(id, 'edit', {
    item_id: 56,
    category_id: 200,
    attribute_list: [],
  });
  let writes = 0;
  await processStoreChange(
    transport((url, init) => {
      if (init.method === 'POST') writes++;
      if (url.pathname.endsWith('get_item_base_info'))
        return envelope({ item_list: [{ item_id: 56, category_id: 100 }] });
      if (url.pathname.endsWith('get_category'))
        return envelope({ category_list: [{ category_id: 200, has_children: false }] });
      return envelope({ attribute_list: [{ attribute_id: 1, is_mandatory: true }] });
    }),
  );
  const [job] = await db
    .select()
    .from(storeAutomationJobs)
    .where(eq(storeAutomationJobs.id, jobId));
  expect(job?.status).toBe('blocked');
  expect(writes).toBe(0);
});
test('duas execuções simultâneas não consomem a mesma alteração', async () => {
  const id = await account();
  const jobId = await queueStoreChange(id, 'edit', { item_id: 57, item_name: 'Novo título' });
  let writes = 0;
  const fetcher = transport((_url, init) => {
    if (init.method === 'POST') {
      writes++;
      return envelope({});
    }
    return envelope({ item_list: [{ item_id: 57, item_name: 'Antigo' }] });
  });
  await Promise.all([processStoreChange(fetcher), processStoreChange(fetcher)]);
  const [job] = await db
    .select()
    .from(storeAutomationJobs)
    .where(eq(storeAutomationJobs.id, jobId));
  expect(job?.status).toBe('completed');
  expect(writes).toBe(1);
  expect(job?.baseline?.item_name).toBe('Antigo');
});
test('uma escrita interrompida permanece incerta após reinício', async () => {
  const id = await account();
  const jobId = await queueStoreChange(id, 'edit', { item_id: 58, item_name: 'Novo' });
  await db
    .update(storeAutomationJobs)
    .set({ status: 'running', leaseUntil: new Date(Date.now() - 1_000) })
    .where(eq(storeAutomationJobs.id, jobId));
  let requests = 0;
  await processStoreChange(
    transport(() => {
      requests++;
      return envelope({});
    }),
  );
  const [job] = await db
    .select()
    .from(storeAutomationJobs)
    .where(eq(storeAutomationJobs.id, jobId));
  expect(job?.status).toBe('unknown');
  expect(requests).toBe(0);
});
test('a saúde distingue uma rotina ativa de um registro antigo', async () => {
  const id = randomUUID();
  await db
    .insert(runtimeHeartbeats)
    .values({ id, service: 'assistant', seenAt: new Date(Date.now() - 100_000) });
  expect(await hasHealthyAssistantWorker()).toBe(false);
  await db
    .update(runtimeHeartbeats)
    .set({ seenAt: new Date() })
    .where(eq(runtimeHeartbeats.id, id));
  expect(await hasHealthyAssistantWorker()).toBe(true);
  await db
    .delete(runtimeHeartbeats)
    .where(and(eq(runtimeHeartbeats.id, id), eq(runtimeHeartbeats.service, 'assistant')));
});

test('a inicialização disponibiliza os três roteiros uma vez e preserva a edição publicada', async () => {
  const before = new Set(
    (await db.select({ id: assistantPlaybooks.id }).from(assistantPlaybooks)).map((row) => row.id),
  );
  let created: string[] = [];
  try {
    await ensureInitialAssistantPlaybooks();
    const first = await db.select().from(assistantPlaybooks);
    created = first.filter((row) => !before.has(row.id)).map((row) => row.id);
    expect(
      new Set(first.filter((row) => row.publishedAt && !row.archivedAt).map((row) => row.strategy))
        .size,
    ).toBe(3);
    const selected = first.find((row) => created.includes(row.id));
    if (selected) {
      const actions = selected.actions.map((action, index) =>
        index === 0 ? { ...action, description: 'Texto revisado pela administração.' } : action,
      );
      await db
        .update(assistantPlaybooks)
        .set({ actions })
        .where(eq(assistantPlaybooks.id, selected.id));
      await ensureInitialAssistantPlaybooks();
      const [unchanged] = await db
        .select()
        .from(assistantPlaybooks)
        .where(eq(assistantPlaybooks.id, selected.id));
      expect(unchanged?.actions[0]?.description).toBe('Texto revisado pela administração.');
    }
    expect(
      (await db.select({ id: assistantPlaybooks.id }).from(assistantPlaybooks))
        .map((row) => row.id)
        .toSorted(),
    ).toEqual(first.map((row) => row.id).toSorted());
  } finally {
    if (created.length)
      await db.delete(assistantPlaybooks).where(inArray(assistantPlaybooks.id, created));
  }
});

test('CTR de relatório conserva origem e período, sem subtrair contadores de outro intervalo', async () => {
  const id = await account();
  const [connection] = await db
    .select()
    .from(shopeeConnections)
    .where(eq(shopeeConnections.userId, id));
  const baselineId = randomUUID(),
    latestId = randomUUID();
  const start = new Date(Date.now() - 86_400_000),
    end = new Date(Date.now() - 1000);
  await db.insert(shopeeCollectionRuns).values([
    {
      id: baselineId,
      userId: id,
      shopId: connection!.shopId,
      applicationId: 'live:123',
      status: 'completed',
      startedAt: start,
    },
    {
      id: latestId,
      userId: id,
      shopId: connection!.shopId,
      applicationId: 'live:123',
      status: 'completed',
      startedAt: end,
      trafficReport: {
        shopId: connection!.shopId,
        applicationId: 'live:123',
        source: 'Relatório autorizado',
        start: start.toISOString(),
        end: end.toISOString(),
        items: [
          { itemId: 11, categoryId: 10, views: 200, impressions: 10000, clicks: 100, sales: 2 },
          { itemId: 12, categoryId: 20, views: 300, impressions: 20000, clicks: 400, sales: 3 },
        ],
      },
    },
  ]);
  await db.insert(assistantCategoryExperiments).values({
    userId: id,
    shopId: connection!.shopId,
    applicationId: 'live:123',
    leftItemId: 11,
    rightItemId: 12,
    baselineRunId: baselineId,
    minViews: 100,
  });
  const [experiment] = await readCategoryExperiments(id);
  expect(experiment?.result.source).toBe('Relatório autorizado');
  expect(experiment?.result.leftCtr).toBe(0.01);
  expect(experiment?.result.rightCtr).toBe(0.02);
  expect(experiment?.result.start).toBe(start.toISOString());
});

test('feed antigo não recupera preço anterior e catálogo completo remove estoque de item ausente', async () => {
  const id = await account();
  const supplierId = `feed-${randomUUID()}`;
  const previousFeeds = process.env.SUPPLIER_FEEDS;
  process.env.SUPPLIER_FEEDS = JSON.stringify([
    {
      id: supplierId,
      name: 'Fornecedor',
      url: 'https://supplier.example.com/catalog',
      imageHosts: ['images.example.com'],
    },
  ]);
  const product = {
    supplierId,
    sku: 'one',
    title: 'Produto real',
    description: 'Descrição',
    images: ['https://images.example.com/one.png'],
    costCents: 1000,
    priceCents: 2000,
    stock: 5,
    weightGrams: 300,
    dimensionsCm: { length: 10, width: 10, height: 10 },
    updatedAt: new Date(Date.now() - 1000).toISOString(),
    variants: [],
    marketplace: { categoryId: 10, brandId: 0, attributes: [] },
  };
  const prepared = publicationPayloadSchema.parse({
    item_name: product.title,
    description: product.description,
    category_id: 10,
    item_sku: product.sku,
    original_price: 20,
    normal_stock: 5,
    weight: 0.3,
    condition: 'NEW',
    item_status: 'NORMAL',
    image: { image_id_list: ['image-id'] },
    dimension: { package_length: 10, package_width: 10, package_height: 10 },
    logistic_info: [{ logistic_id: 1, enabled: true, is_free: false }],
    brand: { brand_id: 0, original_brand_name: '' },
  });
  let products = [product];
  try {
    await db.insert(supplierFeedSubscriptions).values({ userId: id, supplierId });
    const download = async () => ({
      bytes: Buffer.from(
        JSON.stringify({ generatedAt: new Date().toISOString(), complete: true, products }),
      ),
      contentType: 'application/json',
    });
    await syncSupplierFeeds({ download, prepare: async () => prepared });
    const [mapped] = await db
      .select()
      .from(supplierPublicationMappings)
      .where(
        and(eq(supplierPublicationMappings.userId, id), eq(supplierPublicationMappings.sku, 'one')),
      );
    expect(mapped?.payload.original_price).toBe(20);
    const newer = { ...product, priceCents: 3000, updatedAt: new Date().toISOString() };
    await db
      .update(supplierCatalog)
      .set({ product: newer, updatedAt: new Date(newer.updatedAt) })
      .where(and(eq(supplierCatalog.supplierId, supplierId), eq(supplierCatalog.sku, 'one')));
    await db
      .update(supplierFeedSubscriptions)
      .set({ updatedAt: null })
      .where(eq(supplierFeedSubscriptions.userId, id));
    await syncSupplierFeeds({ download, prepare: async () => prepared });
    const [current] = await db
      .select()
      .from(supplierCatalog)
      .where(and(eq(supplierCatalog.supplierId, supplierId), eq(supplierCatalog.sku, 'one')));
    expect(current?.product.priceCents).toBe(3000);
    products = [];
    await db
      .update(supplierFeedSubscriptions)
      .set({ updatedAt: null })
      .where(eq(supplierFeedSubscriptions.userId, id));
    await syncSupplierFeeds({ download, prepare: async () => prepared });
    const [removed] = await db
      .select()
      .from(supplierCatalog)
      .where(and(eq(supplierCatalog.supplierId, supplierId), eq(supplierCatalog.sku, 'one')));
    expect(removed?.product.stock).toBe(0);
  } finally {
    await db.delete(supplierCatalog).where(eq(supplierCatalog.supplierId, supplierId));
    if (previousFeeds === undefined) delete process.env.SUPPLIER_FEEDS;
    else process.env.SUPPLIER_FEEDS = previousFeeds;
  }
});

test('experimento confirma o preço exibido, não reenvia após timeout e concilia o novo SKU', async () => {
  const id = await account();
  const previousDuplication = process.env.SHOPEE_DUPLICATION_ENABLED;
  process.env.SHOPEE_DUPLICATION_ENABLED = 'true';
  const [connection] = await db
    .select()
    .from(shopeeConnections)
    .where(eq(shopeeConnections.userId, id));
  const access = { shopId: connection!.shopId, accessToken: 'test-access' };
  const base = {
    item_id: 101,
    item_name: 'Anúncio original',
    description: 'Descrição',
    item_sku: 'original',
    category_id: 10,
    weight: 0.3,
    condition: 'NEW',
    item_status: 'NORMAL',
    image: { image_id_list: ['original-image'] },
    dimension: { package_length: 10, package_width: 10, package_height: 10 },
    logistic_info: [{ logistic_id: 1, enabled: true, is_free: false }],
    brand: { brand_id: 0, original_brand_name: '' },
    attribute_list: [],
    price_info: [{ currency: 'BRL', original_price: 20 }],
    stock_info_v2: { summary_info: { total_available_stock: 5 } },
  };
  const fetchSource = transport((url) => {
    if (url.pathname.endsWith('get_item_base_info')) return envelope({ item_list: [base] });
    if (url.pathname.endsWith('get_model_list')) return envelope({ tier_variation: [], model: [] });
    if (url.pathname.endsWith('get_category'))
      return envelope({ category_list: [{ category_id: 20, has_children: false }] });
    if (url.pathname.endsWith('get_attributes')) return envelope({ attribute_list: [] });
    throw new Error('Consulta inesperada');
  });
  try {
    const offer = await readCloneOffer(config, access, id, 101, fetchSource);
    const intent = randomUUID();
    const template = newCloneTemplate(
      offer,
      {
        item_name: 'Novo anúncio para comparar',
        category_id: 20,
        image: { image_id_list: ['new-image'] },
      },
      intent,
    );
    expect(template.item_sku).not.toBe('original');
    expect(newCloneTemplate(offer, {}, intent).item_sku).toBe(template.item_sku);
    const payload = { item_id: 101, sourceFingerprint: offer.fingerprint, template };
    const jobId = await queueStoreChange(id, 'clone', payload);
    let writes = 0;
    await processStoreChange(
      transport((url, init) => {
        if (url.pathname.endsWith('add_item')) {
          writes++;
          expect(JSON.parse(String(init.body)).item_sku).toBe(template.item_sku);
          throw new Error('Resposta perdida');
        }
        return fetchSource(url, init);
      }),
    );
    const [job] = await db
      .select()
      .from(storeAutomationJobs)
      .where(eq(storeAutomationJobs.id, jobId));
    expect(job?.status).toBe('unknown');
    expect(writes).toBe(1);
    expect(await queueStoreChange(id, 'clone', payload)).toBe(jobId);
    expect(await processStoreChange(fetchSource)).toBe(false);
    const matched = await reconcileStoreChange(
      id,
      jobId,
      transport((url) =>
        url.pathname.endsWith('get_item_list')
          ? envelope({ item: [{ item_id: 202 }], has_next_page: false })
          : envelope({
              item_list: [
                {
                  item_id: 202,
                  item_sku: template.item_sku,
                  item_name: template.item_name,
                  item_status: 'NORMAL',
                },
              ],
            }),
      ),
    );
    expect(matched).toBe(true);
    expect(writes).toBe(1);
    expect(await queueStoreChange(id, 'clone', payload)).toBe(jobId);
    const runId = randomUUID();
    await db.insert(shopeeCollectionRuns).values({
      id: runId,
      userId: id,
      shopId: access.shopId,
      applicationId: 'live:123',
      status: 'completed',
      startedAt: new Date(Date.now() + 1000),
      completedAt: new Date(Date.now() + 1000),
    });
    await db.insert(shopeeMetricSnapshots).values([
      { runId, itemId: 101, title: 'Original', categoryId: 10, views: 10 },
      { runId, itemId: 202, title: 'Novo', categoryId: 20, views: 0 },
    ]);
    await startReadyCloneExperiments(id, runId);
    await startReadyCloneExperiments(id, runId);
    const experiments = await db
      .select()
      .from(assistantCategoryExperiments)
      .where(eq(assistantCategoryExperiments.userId, id));
    expect(experiments).toHaveLength(1);
    expect(experiments[0]?.baselineRunId).toBe(runId);
  } finally {
    if (previousDuplication === undefined) delete process.env.SHOPEE_DUPLICATION_ENABLED;
    else process.env.SHOPEE_DUPLICATION_ENABLED = previousDuplication;
  }
});

test('retoma somente a ativação de variações confirmadas sem criar outro anúncio ou modelo', async () => {
  const id = await account();
  const previousSetting = process.env.SHOPEE_DUPLICATION_ENABLED;
  process.env.SHOPEE_DUPLICATION_ENABLED = 'true';
  const variations = {
    tier_variation: [{ name: 'Cor', option_list: [{ option: 'Azul' }] }],
    model: [{ model_sku: 'new-blue', tier_index: [0], original_price: 20, normal_stock: 5 }],
  };
  const template = publicationPayloadSchema.parse({
    item_name: 'Novo anúncio',
    description: 'Descrição',
    category_id: 20,
    item_sku: `new-${id}`,
    original_price: 20,
    normal_stock: 5,
    weight: 0.3,
    condition: 'NEW',
    item_status: 'NORMAL',
    image: { image_id_list: ['image-id'] },
    dimension: { package_length: 10, package_width: 10, package_height: 10 },
    logistic_info: [{ logistic_id: 1, enabled: true, is_free: false }],
    brand: { brand_id: 0, original_brand_name: '' },
    variations,
  });
  try {
    const jobId = await queueStoreChange(id, 'clone', {
      item_id: 101,
      sourceFingerprint: 'a'.repeat(64),
      template,
    });
    await db
      .update(storeAutomationJobs)
      .set({ status: 'unknown', result: { itemId: 303 } })
      .where(eq(storeAutomationJobs.id, jobId));
    let writes = 0;
    const fetcher = transport((url, init) => {
      if (init.method === 'POST') {
        writes++;
        expect(url.pathname).toBe('/api/v2/product/update_item');
        expect(JSON.parse(String(init.body))).toEqual({ item_id: 303, item_status: 'NORMAL' });
        return envelope({});
      }
      if (url.pathname.endsWith('get_item_list'))
        return envelope({
          item: url.searchParams.get('item_status') === 'UNLIST' ? [{ item_id: 303 }] : [],
          has_next_page: false,
        });
      if (url.pathname.endsWith('get_item_base_info'))
        return envelope({
          item_list: [{ item_id: 303, item_sku: template.item_sku, item_name: template.item_name }],
        });
      if (url.pathname.endsWith('get_model_list'))
        return envelope({
          tier_variation: variations.tier_variation,
          model: [
            {
              model_sku: 'new-blue',
              tier_index: [0],
              price_info: [{ original_price: 20 }],
              stock_info_v2: { summary_info: { total_available_stock: 5 } },
            },
          ],
        });
      throw new Error('Consulta inesperada');
    });
    expect(await finishClonedVariations(id, jobId, fetcher)).toBe(true);
    expect(await finishClonedVariations(id, jobId, fetcher)).toBe(false);
    expect(writes).toBe(1);
  } finally {
    if (previousSetting === undefined) delete process.env.SHOPEE_DUPLICATION_ENABLED;
    else process.env.SHOPEE_DUPLICATION_ENABLED = previousSetting;
  }
});

test('automatic brand publication is independent of product publication and confirms remote fields', async () => {
  const id = await account();
  const brand = {
    name: 'Automatic store',
    description: 'Approved description',
    logoImage: `logos/${id}/test.png`,
  };
  const sourceFingerprint = brandFingerprint(brand);
  await db.insert(storeBrand).values({
    userId: id,
    ...brand,
    completedAt: new Date(),
    publicationFingerprint: sourceFingerprint,
  });
  const png = await sharp({ create: { width: 50, height: 50, channels: 4, background: '#ffffff' } })
    .png()
    .toBuffer();
  let uploads = 0;
  let writes = 0;
  let profile: Record<string, unknown> = { shop_name: 'Previous' };
  const fetcher = transport((url, init) => {
    if (url.pathname.endsWith('upload_image')) {
      uploads++;
      return envelope({
        image_info: {
          image_id: 'image-one',
          image_url_list: [{ image_url: 'https://images.example.com/one.jpg' }],
        },
      });
    }
    if (url.pathname.endsWith('get_profile')) return envelope(profile);
    if (url.pathname.endsWith('update_profile')) {
      writes++;
      profile = JSON.parse(String(init.body));
      return envelope({});
    }
    throw new Error('Unexpected endpoint');
  });
  process.env.SHOPEE_PUBLICATION_ENABLED = 'false';
  try {
    expect(await queueAutomaticBrands(fetcher, async () => png)).toBe(1);
    expect(await queueAutomaticBrands(fetcher, async () => png)).toBe(0);
    expect(uploads).toBe(1);
    await processStoreChange(fetcher);
    const [job] = await db
      .select()
      .from(storeAutomationJobs)
      .where(eq(storeAutomationJobs.userId, id));
    expect(job?.status).toBe('completed');
    expect(profile.shop_name).toBe(brand.name);
    expect(profile.description).toBe(brand.description);
    expect(writes).toBe(1);
    expect(await queueAutomaticBrands(fetcher, async () => png)).toBe(0);
    await db
      .update(storeBrand)
      .set({ description: 'Unapproved edit', publicationFingerprint: null })
      .where(eq(storeBrand.userId, id));
    expect(await queueAutomaticBrands(fetcher, async () => png)).toBe(0);
    await expect(queueApprovedBrand(id, fetcher, async () => png)).rejects.toThrow();
  } finally {
    process.env.SHOPEE_PUBLICATION_ENABLED = 'true';
  }
});

test('an obsolete approved snapshot never reaches Shopee and a successful write still needs read-back', async () => {
  const id = await account();
  const brand = {
    name: 'Original store',
    description: 'Original description',
    logoImage: `logos/${id}/test.png`,
  };
  const fingerprint = brandFingerprint(brand);
  await db
    .insert(storeBrand)
    .values({ userId: id, ...brand, completedAt: new Date(), publicationFingerprint: fingerprint });
  const payload = {
    shop_name: brand.name,
    description: brand.description,
    shop_logo: 'https://images.example.com/logo.jpg',
  };
  const jobId = await queueStoreChange(id, 'brand', payload, fingerprint);
  await db
    .update(storeBrand)
    .set({ publicationFingerprint: null })
    .where(eq(storeBrand.userId, id));
  let writes = 0;
  const fetcher = transport((url) => {
    if (url.pathname.endsWith('get_profile')) return envelope({ shop_name: 'Previous' });
    writes++;
    return envelope({});
  });
  await processStoreChange(fetcher);
  const [obsolete] = await db
    .select()
    .from(storeAutomationJobs)
    .where(eq(storeAutomationJobs.id, jobId));
  expect(obsolete?.status).toBe('blocked');
  expect(writes).toBe(0);
  const second = await account();
  const secondId = await queueStoreChange(second, 'brand', payload);
  await processStoreChange(fetcher);
  const [unconfirmed] = await db
    .select()
    .from(storeAutomationJobs)
    .where(eq(storeAutomationJobs.id, secondId));
  expect(unconfirmed?.status).toBe('unknown');
  expect(writes).toBe(1);
  expect(
    await reconcileStoreChange(
      second,
      secondId,
      transport(() => envelope(payload)),
    ),
  ).toBe(true);
  expect(writes).toBe(1);
});

test('a rejected read-back after an acknowledged profile write remains uncertain', async () => {
  const id = await account();
  const payload = {
    shop_name: 'Read-back store',
    description: 'Description',
    shop_logo: 'https://images.example.com/read-back.jpg',
  };
  const jobId = await queueStoreChange(id, 'brand', payload);
  let reads = 0;
  let writes = 0;
  await processStoreChange(
    transport((url) => {
      if (url.pathname.endsWith('get_profile')) {
        reads++;
        return reads === 1
          ? envelope({ shop_name: 'Before' })
          : Response.json({ error: 'permission_denied' });
      }
      writes++;
      return envelope({});
    }),
  );
  const [job] = await db
    .select()
    .from(storeAutomationJobs)
    .where(eq(storeAutomationJobs.id, jobId));
  expect(job?.status).toBe('unknown');
  expect(writes).toBe(1);
  expect(
    await reconcileStoreChange(
      id,
      jobId,
      transport(() => envelope(payload)),
    ),
  ).toBe(true);
  expect(writes).toBe(1);
});
