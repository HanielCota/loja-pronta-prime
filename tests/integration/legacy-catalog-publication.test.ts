import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { db } from '../../src/server/db';
import { seedRecoveredCatalog, fixtureImage } from '../support/recovered-catalog';
import {
  importRecoveredProducts,
  importedProduct,
  importedProducts,
  reviewImportedProduct,
} from '../../src/features/legacy-stores/server/catalog-data';
import {
  saveRecoveredPublicationOptions,
  reviewRecoveredPublication,
  confirmRecoveredPublication,
  recoveredPublication,
  claimRecoveredPublication,
} from '../../src/features/legacy-stores/server/publication-data';
import { executeRecoveredPublication } from '../../src/features/legacy-stores/server/publication-worker';
import {
  shopeeConfigurationSchema,
  shopeeTokenOwner,
} from '../../src/features/shopee/authorization';
import {
  readShopeeAccess,
  removeShopeeConnection,
} from '../../src/features/shopee/server/connection';
import { encryptShopeeToken } from '../../src/lib/shopee-protocol';
import {
  loadRecoveredPublicationOptions,
  recoveredPublicationOptions,
  recoveredCategoryOptions,
} from '../../src/features/legacy-stores/server/publication-options';
import type { PublicationContext } from '../../src/features/legacy-stores/publication';
import { rejection } from '../support/rejection';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const owner = randomUUID(),
  other = randomUUID();
const authorizationId = randomUUID();
const destination = { applicationId: 'live:1', shopId: 321, authorizationId };
let fixture: Awaited<ReturnType<typeof seedRecoveredCatalog>>;
const config = shopeeConfigurationSchema.parse({
  SHOPEE_PARTNER_ID: 1,
  SHOPEE_PARTNER_KEY: 'test',
  SHOPEE_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
  SHOPEE_ENABLED: 'true',
});
const context: PublicationContext = {
  version: randomUUID(),
  shopName: 'Connected test store',
  categories: [{ id: 10, name: 'Shoes' }],
  categoryId: 10,
  channels: [{ id: 20, name: 'Delivery' }],
  attributes: [],
  brands: [{ id: 0, name: 'No brand' }],
};
afterAll(async () => {
  try {
    await pool.query('DELETE FROM "user" WHERE id=ANY($1::text[])', [[owner, other]]);
    if (fixture) {
      await pool.query('DELETE FROM legacy_store_products WHERE id=ANY($1::uuid[])', [fixture.ids]);
      await pool.query('DELETE FROM legacy_stores WHERE id=$1', [fixture.storeId]);
      await pool.query('DELETE FROM legacy_customers WHERE id=$1', [fixture.customerId]);
    }
  } finally {
    await Promise.all([pool.end(), db.$client.end()]);
  }
});
function input(version: string) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    optionsVersion: version,
    currentData: 'confirmed',
    'cost-0': '20,00',
    'price-0': '49,90',
    'stock-0': '3',
    'cost-1': '21,00',
    'price-1': '59,90',
    'stock-1': '0',
    weightGrams: '500',
    length: '20',
    width: '12',
    height: '8',
    brandId: '0',
    channelId: '20',
  }))
    form.set(key, value);
  return form;
}
function api(
  options: {
    timeout?: boolean;
    badModels?: boolean;
    duplicate?: string;
    region?: string;
    shopStatus?: string;
    revoke?: () => Promise<void>;
  } = {},
) {
  const calls: { path: string; body: any }[] = [];
  let listing: any,
    models: any,
    status = 'UNLIST';
  const fetcher = (async (url, init) => {
    const path = new URL(String(url)).pathname;
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    calls.push({ path, body });
    let response: unknown;
    if (path.endsWith('/get_shop_info'))
      response = {
        shop_name: 'Connected test store',
        region: options.region ?? 'BR',
        status: options.shopStatus ?? 'NORMAL',
      };
    else if (path.endsWith('/get_item_list'))
      response = { item: options.duplicate ? [{ item_id: 101 }] : [], has_next_page: false };
    else if (path.endsWith('/get_category'))
      response = {
        category_list: [{ category_id: 10, has_children: false, display_category_name: 'Shoes' }],
      };
    else if (path.endsWith('/get_attribute_tree'))
      response = { list: [{ category_id: 10, attribute_tree: [] }] };
    else if (path.endsWith('/get_item_limit'))
      response = {
        price_limit: { min_limit: 1, max_limit: 1000000 },
        stock_limit: { min_limit: 0, max_limit: 1000000 },
        item_name_length_limit: { min_limit: 1, max_limit: 120 },
        item_description_length_limit: { min_limit: 1, max_limit: 5000 },
        item_image_count_limit: { min_limit: 1, max_limit: 9 },
        gtin_limit: { gtin_validation_rule: 'Optional' },
        size_chart_limit: { size_chart_mandatory: false },
      };
    else if (path.endsWith('/get_brand_list')) response = { brand_list: [], has_next_page: false };
    else if (path.endsWith('/get_channel_list'))
      response = {
        logistics_channel_list: [
          { logistics_channel_id: 20, enabled: true, logistics_channel_name: 'Delivery' },
        ],
      };
    else if (path.endsWith('/upload_image'))
      response = { image_info: { image_id: 'uploaded-test-image' } };
    else if (path.endsWith('/add_item')) {
      listing = body;
      if (options.timeout) throw new Error('timeout');
      response = { item_id: 101 };
    } else if (path.endsWith('/init_tier_variation')) {
      models = body;
      response = {};
      if (options.revoke) await options.revoke();
    } else if (path.endsWith('/get_model_list'))
      response = {
        tier_variation: models?.tier_variation ?? [],
        model: (models?.model ?? []).map((model: any) => ({
          ...model,
          price_info: [{ original_price: model.original_price }],
          stock_info_v2: {
            summary_info: {
              total_available_stock: options.badModels ? 999 : model.seller_stock[0].stock,
            },
          },
        })),
      };
    else if (path.endsWith('/get_item_base_info'))
      response = {
        item_list: [
          {
            item_id: 101,
            item_sku: listing?.item_sku ?? options.duplicate ?? 'duplicate',
            item_name: listing?.item_name ?? 'Duplicate',
            category_id: 10,
            item_status: status,
            has_model: Boolean(models),
            price_info: [{ original_price: listing?.original_price ?? 49.9 }],
            stock_info_v2: {
              summary_info: { total_available_stock: listing?.seller_stock?.[0]?.stock ?? 3 },
            },
          },
        ],
      };
    else if (path.endsWith('/update_item')) {
      status = body.item_status;
      response = {};
    } else throw new Error(`Unexpected API path ${path}`);
    return Response.json({ error: '', response });
  }) as typeof fetch;
  return { calls, fetcher };
}
async function reviewed(index: number, target = destination) {
  const id = fixture.ids[index]!;
  await saveRecoveredPublicationOptions(
    pool,
    owner,
    id,
    target.applicationId,
    target.shopId,
    context,
  );
  const publication = (await recoveredPublication(pool, owner, id))!;
  const imported = (await importedProduct(pool, owner, id))!;
  expect(
    await reviewRecoveredPublication(
      pool,
      owner,
      id,
      imported.revision,
      publication.id,
      target,
      input(context.version),
    ),
  ).toBe(true);
  return { id, imported, row: (await recoveredPublication(pool, owner, id))! };
}
async function confirmed(index: number) {
  const value = await reviewed(index);
  expect(
    await confirmRecoveredPublication(pool, owner, value.id, value.row.fingerprint!, destination),
  ).toBe(true);
  return { ...value, job: (await claimRecoveredPublication(pool))! };
}
const deps = (fake: ReturnType<typeof api>, enabled = () => true) => ({
  enabled,
  assertAccess: async () => config,
  readAccess: async () => ({ shopId: 321, accessToken: 'test', authorizationId }),
  readImage: async () => fixtureImage,
  waitForItem: async () => {},
  fetcher: fake.fetcher,
});

test('recovered publication requires a current owned review and exact destination before any writes', async () => {
  for (const id of [owner, other])
    await pool.query(
      'INSERT INTO "user"(id,name,email,email_verified,must_change_password) VALUES($1,$1,$2,true,false)',
      [id, `${id}@example.invalid`],
    );
  fixture = await seedRecoveredCatalog(pool, owner, 16);
  await importRecoveredProducts(pool, owner, { storeId: fixture.storeId, productIds: fixture.ids });
  await pool.query(
    "INSERT INTO shopee_connections(user_id,shop_id,application_id,authorization_id,access_token_encrypted,refresh_token_encrypted,access_token_expires_at) VALUES($1,321,'live:1',$2,'test','test',now()+interval '1 hour')",
    [owner, authorizationId],
  );
  const fake = api();
  const metadata = await recoveredPublicationOptions(
    config,
    { shopId: 321, accessToken: 'test' },
    fake.fetcher,
  );
  await recoveredCategoryOptions(
    config,
    { shopId: 321, accessToken: 'test' },
    metadata,
    10,
    fake.fetcher,
  );
  expect(fake.calls.every((call) => !call.body)).toBe(true);
  const { id, row, imported } = await reviewed(0);
  expect(await claimRecoveredPublication(pool)).toBeNull();
  expect(await recoveredPublication(pool, other, id)).toBeNull();
  await rejection(confirmRecoveredPublication(pool, other, id, row.fingerprint!, destination));
  expect(
    await confirmRecoveredPublication(pool, owner, id, row.fingerprint!, {
      ...destination,
      shopId: 322,
    }),
  ).toBe(false);
  expect(await confirmRecoveredPublication(pool, owner, id, 'b'.repeat(64), destination)).toBe(
    false,
  );
  expect(
    await reviewImportedProduct(pool, owner, {
      productId: id,
      revision: imported.revision,
      title: 'Changed title',
      description: imported.product.description,
      price: '49,90',
    }),
  ).toBe(true);
  expect(await confirmRecoveredPublication(pool, owner, id, row.fingerprint!, destination)).toBe(
    false,
  );
  const expired = await reviewed(1);
  expect(
    await confirmRecoveredPublication(
      pool,
      owner,
      expired.id,
      expired.row.fingerprint!,
      destination,
      new Date(Date.now() + 16 * 60 * 1000),
    ),
  ).toBe(false);
});
test('confirmed queue serializes retries, freezes edits and verifies variants before listing', async () => {
  const { id, row } = await reviewed(2);
  const results = await Promise.all([
    confirmRecoveredPublication(pool, owner, id, row.fingerprint!, destination),
    confirmRecoveredPublication(pool, owner, id, row.fingerprint!, destination),
  ]);
  expect(results).toEqual([true, true]);
  const jobs = await Promise.all([
    claimRecoveredPublication(pool),
    claimRecoveredPublication(pool),
  ]);
  const job = jobs.find(Boolean)!;
  expect(jobs.filter(Boolean)).toHaveLength(1);
  expect(
    await reviewImportedProduct(pool, owner, {
      productId: id,
      revision: 1,
      title: 'Forbidden edit',
      description: 'Test description',
      price: '49,90',
    }),
  ).toBe(false);
  const fake = api();
  expect(await executeRecoveredPublication(pool, job, deps(fake))).toBe('published');
  expect(fake.calls.filter((call) => call.path.endsWith('/add_item'))).toHaveLength(1);
  const written = fake.calls.find((call) => call.path.endsWith('/add_item'))!.body;
  expect(written.item_status).toBe('UNLIST');
  expect(written.seller_stock).toEqual([{ stock: 3 }]);
  expect(written.normal_stock).toBeUndefined();
  const models = fake.calls.find((call) => call.path.endsWith('/init_tier_variation'))!.body.model;
  expect(models.map((model: any) => model.seller_stock)).toEqual([[{ stock: 3 }], [{ stock: 0 }]]);
  expect(models.every((model: any) => model.normal_stock === undefined)).toBe(true);
  expect(fake.calls.findIndex((call) => call.path.endsWith('/get_model_list'))).toBeLessThan(
    fake.calls.findIndex((call) => call.path.endsWith('/update_item')),
  );
  expect((await recoveredPublication(pool, owner, id))?.status).toBe('published');
  expect(
    (await importedProducts(pool, owner, 1, fixture.storeId)).find(
      (product) => product.product_id === id,
    )?.publication_status,
  ).toBe('published');
  await executeRecoveredPublication(pool, job, deps(fake));
  expect(fake.calls.filter((call) => call.path.endsWith('/add_item'))).toHaveLength(1);
  expect(await claimRecoveredPublication(pool)).toBeNull();
});
test('uncertain writes, mismatched models, changed ownership and expired leases never repeat listings', async () => {
  const timeout = await confirmed(3),
    timeoutApi = api({ timeout: true });
  expect(await executeRecoveredPublication(pool, timeout.job, deps(timeoutApi))).toBe('unknown');
  await executeRecoveredPublication(pool, timeout.job, deps(timeoutApi));
  expect(timeoutApi.calls.filter((call) => call.path.endsWith('/add_item'))).toHaveLength(1);
  const mismatch = await confirmed(4),
    mismatchApi = api({ badModels: true });
  expect(await executeRecoveredPublication(pool, mismatch.job, deps(mismatchApi))).toBe('unknown');
  expect(mismatchApi.calls.filter((call) => call.path.endsWith('/update_item'))).toHaveLength(0);
  const revoked = await confirmed(5),
    revokeApi = api({
      revoke: async () => {
        await pool.query('UPDATE shopee_connections SET revoked_at=now() WHERE user_id=$1', [
          owner,
        ]);
      },
    });
  expect(await executeRecoveredPublication(pool, revoked.job, deps(revokeApi))).toBe('unknown');
  expect(revokeApi.calls.filter((call) => call.path.endsWith('/update_item'))).toHaveLength(0);
  await pool.query('UPDATE shopee_connections SET revoked_at=null WHERE user_id=$1', [owner]);
  const stale = await confirmed(6),
    staleApi = api();
  expect(
    await executeRecoveredPublication(
      pool,
      stale.job,
      deps(staleApi, () => false),
    ),
  ).toBe('blocked');
  expect(staleApi.calls).toHaveLength(0);
  const crash = await confirmed(7);
  await pool.query(
    "UPDATE legacy_catalog_publications SET status='sending',lease_until=now()-interval '1 second' WHERE id=$1",
    [crash.job.id],
  );
  expect(await claimRecoveredPublication(pool)).toBeNull();
  expect((await recoveredPublication(pool, owner, crash.id))?.status).toBe('unknown');
  const changed = await confirmed(8),
    changedApi = api();
  await pool.query('UPDATE legacy_customers SET user_id=$2 WHERE id=$1', [
    fixture.customerId,
    other,
  ]);
  expect(await executeRecoveredPublication(pool, changed.job, deps(changedApi))).toBe('blocked');
  expect(changedApi.calls).toHaveLength(0);
  await pool.query('UPDATE legacy_customers SET user_id=$2 WHERE id=$1', [
    fixture.customerId,
    owner,
  ]);
});

test('recovered publication blocks duplicate SKUs, altered source records and corrupt images', async () => {
  const duplicate = await confirmed(9);
  // Exact SKU response is read from the queued snapshot, never from a browser-supplied identifier.
  const actualDuplicate = api({ duplicate: duplicate.job.intent!.offer.sku });
  expect(await executeRecoveredPublication(pool, duplicate.job, deps(actualDuplicate))).toBe(
    'blocked',
  );
  expect(actualDuplicate.calls.some((call) => call.path.endsWith('/add_item'))).toBe(false);
  expect((await recoveredPublication(pool, owner, duplicate.id))?.failure).toBe('duplicate');
  const corrupt = await confirmed(10),
    corruptApi = api();
  expect(
    await executeRecoveredPublication(pool, corrupt.job, {
      ...deps(corruptApi),
      readImage: async () => new Uint8Array([1, 2, 3]),
    }),
  ).toBe('blocked');
  expect(
    corruptApi.calls.some(
      (call) => call.path.endsWith('/upload_image') || call.path.endsWith('/add_item'),
    ),
  ).toBe(false);
  const drift = await confirmed(11),
    driftApi = api();
  await pool.query(
    "UPDATE legacy_store_products SET record=jsonb_set(record,'{titulo}','\"Changed original\"') WHERE id=$1",
    [drift.id],
  );
  expect(await executeRecoveredPublication(pool, drift.job, deps(driftApi))).toBe('blocked');
  expect(driftApi.calls).toHaveLength(0);
});

test('recovered publication rejects non-Brazilian or restricted shops before reading listing metadata', async () => {
  for (const options of [{ region: 'SG' }, { shopStatus: 'FROZEN' }]) {
    const blocked = api(options);
    await rejection(
      recoveredPublicationOptions(config, { shopId: 321, accessToken: 'test' }, blocked.fetcher),
    );
    expect(blocked.calls.map((call) => call.path)).toEqual(['/api/v2/shop/get_shop_info']);
  }
});

test('reconnecting the same shop cannot authorize the remaining writes of an in-flight listing', async () => {
  const { job } = await confirmed(12);
  const fake = api({
    revoke: async () => {
      await pool.query('UPDATE shopee_connections SET authorization_id=$2 WHERE user_id=$1', [
        owner,
        randomUUID(),
      ]);
    },
  });

  try {
    expect(await executeRecoveredPublication(pool, job, deps(fake))).toBe('unknown');
    expect(fake.calls.filter((call) => call.path.endsWith('/add_item'))).toHaveLength(1);
    expect(fake.calls.filter((call) => call.path.endsWith('/update_item'))).toHaveLength(0);
  } finally {
    await pool.query('UPDATE shopee_connections SET authorization_id=$2 WHERE user_id=$1', [
      owner,
      authorizationId,
    ]);
  }
});

test('a queued recovered listing without a recorded authorization requires a new confirmation', async () => {
  const { id, row } = await reviewed(15);
  expect(await confirmRecoveredPublication(pool, owner, id, row.fingerprint!, destination)).toBe(
    true,
  );
  await pool.query('UPDATE legacy_catalog_publications SET authorization_id=NULL WHERE id=$1', [
    row.id,
  ]);

  const job = (await claimRecoveredPublication(pool))!;
  const fake = api();
  expect(await executeRecoveredPublication(pool, job, deps(fake))).toBe('blocked');
  expect(fake.calls).toHaveLength(0);
  expect((await recoveredPublication(pool, owner, id))?.failure).toBe('authorization-changed');
});

test('reconnecting the same shop before the worker runs requires a new review and confirmation', async () => {
  const unconfirmed = await reviewed(13);
  const queued = await reviewed(14);
  expect(
    await confirmRecoveredPublication(pool, owner, queued.id, queued.row.fingerprint!, destination),
  ).toBe(true);
  expect((await recoveredPublication(pool, owner, queued.id))?.status).toBe('pending');

  await removeShopeeConnection(owner, config);
  const reconnected = { ...destination, authorizationId: randomUUID() };
  const tokenOwner = shopeeTokenOwner(owner, reconnected.shopId, config);
  const key = config.SHOPEE_TOKEN_ENCRYPTION_KEY;
  await pool.query(
    `INSERT INTO shopee_connections(user_id,shop_id,application_id,authorization_id,access_token_encrypted,refresh_token_encrypted,access_token_expires_at)
    VALUES($1,$2,$3,$4,$5,$6,now()+interval '1 hour')`,
    [
      owner,
      reconnected.shopId,
      reconnected.applicationId,
      reconnected.authorizationId,
      encryptShopeeToken('new-access', key, tokenOwner),
      encryptShopeeToken('new-refresh', key, tokenOwner),
    ],
  );

  for (const target of [destination, reconnected]) {
    expect(
      await confirmRecoveredPublication(
        pool,
        owner,
        unconfirmed.id,
        unconfirmed.row.fingerprint!,
        target,
      ),
    ).toBe(false);
  }

  const oldJob = (await claimRecoveredPublication(pool))!;
  expect(oldJob.id).toBe(queued.row.id);
  expect(oldJob.authorization_id).toBe(destination.authorizationId);
  const fake = api();
  let accessReads = 0;
  const liveDeps = {
    ...deps(fake),
    readAccess: async () => {
      accessReads++;
      return readShopeeAccess(owner, config);
    },
  };
  expect(await executeRecoveredPublication(pool, oldJob, liveDeps)).toBe('blocked');
  expect(accessReads).toBe(0);
  expect(fake.calls).toHaveLength(0);
  expect((await recoveredPublication(pool, owner, queued.id))?.failure).toBe(
    'authorization-changed',
  );

  const fresh = await reviewed(14, reconnected);
  expect(fresh.row.fingerprint).not.toBe(queued.row.fingerprint);
  expect(await claimRecoveredPublication(pool)).toBeNull();
  expect(
    await confirmRecoveredPublication(pool, owner, fresh.id, queued.row.fingerprint!, reconnected),
  ).toBe(false);
  expect(
    await confirmRecoveredPublication(pool, owner, fresh.id, fresh.row.fingerprint!, reconnected),
  ).toBe(true);
  const newJob = (await claimRecoveredPublication(pool))!;
  expect(newJob.authorization_id).toBe(reconnected.authorizationId);
  expect(await executeRecoveredPublication(pool, newJob, liveDeps)).toBe('published');
  expect(fake.calls.filter((call) => call.path.endsWith('/add_item'))).toHaveLength(1);
});

test('the preparation deadline stops brand pagination and cancels the active request', async () => {
  const controller = new AbortController();
  const fake = api();
  const offsets: string[] = [];
  let activeRequestAborted = false;
  const fetcher = (async (request, init) => {
    const url = new URL(String(request));
    if (!url.pathname.endsWith('/get_brand_list')) {
      return fake.fetcher(request, init);
    }

    const offset = url.searchParams.get('offset')!;
    offsets.push(offset);
    if (offset === '0') {
      return Response.json({ error: '', response: { brand_list: [], has_next_page: true } });
    }

    controller.abort();
    activeRequestAborted = init?.signal?.aborted ?? false;
    init?.signal?.throwIfAborted();
    throw new Error('The active request did not receive the preparation deadline.');
  }) as typeof fetch;

  const error = await rejection(
    loadRecoveredPublicationOptions(
      config,
      { shopId: 321, accessToken: 'test' },
      10,
      controller.signal,
      fetcher,
    ),
  );
  expect(activeRequestAborted).toBe(true);
  expect(offsets).toEqual(['0', '100']);
  expect(error).toMatchObject({ name: 'ShopeeApiError', reason: 'unavailable' });
});
