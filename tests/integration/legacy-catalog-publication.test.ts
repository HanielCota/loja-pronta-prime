import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { seedRecoveredCatalog, fixtureImage } from '../support/recovered-catalog';
import {
  importRecoveredProducts,
  importedProduct,
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
import { shopeeConfigurationSchema } from '../../src/features/shopee/authorization';
import {
  recoveredPublicationOptions,
  recoveredCategoryOptions,
} from '../../src/features/legacy-stores/server/publication-options';
import type { PublicationContext } from '../../src/features/legacy-stores/publication';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const owner = randomUUID(),
  other = randomUUID();
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
    await pool.end();
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
async function reviewed(index: number) {
  const id = fixture.ids[index]!;
  await saveRecoveredPublicationOptions(pool, owner, id, 'live:1', 321, context);
  const publication = (await recoveredPublication(pool, owner, id))!;
  const imported = (await importedProduct(pool, owner, id))!;
  await reviewRecoveredPublication(
    pool,
    owner,
    id,
    imported.revision,
    publication.id,
    input(context.version),
  );
  return { id, imported, row: (await recoveredPublication(pool, owner, id))! };
}
async function confirmed(index: number) {
  const value = await reviewed(index);
  expect(
    await confirmRecoveredPublication(pool, owner, value.id, value.row.fingerprint!, 'live:1', 321),
  ).toBe(true);
  return { ...value, job: (await claimRecoveredPublication(pool))! };
}
const deps = (fake: ReturnType<typeof api>, enabled = () => true) => ({
  enabled,
  assertAccess: async () => config,
  readAccess: async () => ({ shopId: 321, accessToken: 'test' }),
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
  fixture = await seedRecoveredCatalog(pool, owner, 12);
  await importRecoveredProducts(pool, owner, { storeId: fixture.storeId, productIds: fixture.ids });
  await pool.query(
    "INSERT INTO shopee_connections(user_id,shop_id,application_id,access_token_encrypted,refresh_token_encrypted,access_token_expires_at) VALUES($1,321,'live:1','test','test',now()+interval '1 hour')",
    [owner],
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
  await expect(
    confirmRecoveredPublication(pool, other, id, row.fingerprint!, 'live:1', 321),
  ).rejects.toThrow();
  expect(await confirmRecoveredPublication(pool, owner, id, row.fingerprint!, 'live:1', 322)).toBe(
    false,
  );
  expect(await confirmRecoveredPublication(pool, owner, id, 'b'.repeat(64), 'live:1', 321)).toBe(
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
  expect(await confirmRecoveredPublication(pool, owner, id, row.fingerprint!, 'live:1', 321)).toBe(
    false,
  );
  const expired = await reviewed(1);
  expect(
    await confirmRecoveredPublication(
      pool,
      owner,
      expired.id,
      expired.row.fingerprint!,
      'live:1',
      321,
      new Date(Date.now() + 16 * 60 * 1000),
    ),
  ).toBe(false);
});
test('confirmed queue serializes retries, freezes edits and verifies variants before listing', async () => {
  const { id, row } = await reviewed(2);
  const results = await Promise.all([
    confirmRecoveredPublication(pool, owner, id, row.fingerprint!, 'live:1', 321),
    confirmRecoveredPublication(pool, owner, id, row.fingerprint!, 'live:1', 321),
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
    await expect(
      recoveredPublicationOptions(config, { shopId: 321, accessToken: 'test' }, blocked.fetcher),
    ).rejects.toThrow();
    expect(blocked.calls.map((call) => call.path)).toEqual(['/api/v2/shop/get_shop_info']);
  }
});
