import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import {
  importRecoveredProducts,
  importedProduct,
  recoveredProduct,
  recoveredStores,
  reviewImportedProduct,
} from '../../src/features/legacy-stores/server/catalog-data';
import { LEGACY_CATALOG_RUN } from '../../src/config/legacy-catalog';
import { seedRecoveredCatalog } from '../support/recovered-catalog';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
afterAll(() => pool.end());
test('imports only audited own products, preserves edits on retries, and isolates review and media', async () => {
  const owner = randomUUID(),
    other = randomUUID();
  for (const id of [owner, other])
    await pool.query(
      'INSERT INTO "user"(id,name,email,email_verified,must_change_password) VALUES($1,$1,$2,true,false)',
      [id, `${id}@example.invalid`],
    );
  const fixture = await seedRecoveredCatalog(pool, owner);
  expect(await recoveredStores(pool, other)).toHaveLength(0);
  expect(await recoveredProduct(pool, other, fixture.ids[0]!)).toBeNull();
  await expect(
    importRecoveredProducts(pool, other, { storeId: fixture.storeId, productIds: fixture.ids }),
  ).rejects.toThrow();
  expect(
    await importRecoveredProducts(pool, owner, {
      storeId: fixture.storeId,
      productIds: fixture.ids,
    }),
  ).toBe(2);
  const draft = await importedProduct(pool, owner, fixture.ids[0]!);
  expect(draft?.product.publicationReady).toBe(false);
  expect(draft?.product.variants.length).toBe(2);
  expect(JSON.stringify(draft?.product)).not.toContain('model_id');
  expect(await importedProduct(pool, other, fixture.ids[0]!)).toBeNull();
  const edit = {
    productId: fixture.ids[0],
    revision: 1,
    title: 'Reviewed shoes',
    description: 'Reviewed copy',
    price: '59,90',
  };
  expect(await reviewImportedProduct(pool, other, edit)).toBe(false);
  expect(await reviewImportedProduct(pool, owner, edit)).toBe(true);
  expect(await reviewImportedProduct(pool, owner, { ...edit, title: 'Stale tab' })).toBe(false);
  expect(
    await importRecoveredProducts(pool, owner, {
      storeId: fixture.storeId,
      productIds: fixture.ids,
    }),
  ).toBe(0);
  expect((await importedProduct(pool, owner, fixture.ids[0]!))?.product.title).toBe(
    'Reviewed shoes',
  );
  expect((await importedProduct(pool, owner, fixture.ids[0]!))?.product.priceCents).toBe(5990);
  await pool.query(
    "UPDATE legacy_store_products SET record=jsonb_set(record,'{titulo}','\"Changed source\"') WHERE id=$1",
    [fixture.ids[0]],
  );
  expect(await importedProduct(pool, owner, fixture.ids[0]!)).toBeNull();
  expect(await recoveredProduct(pool, owner, fixture.ids[0]!)).toBeNull();
  await expect(
    importRecoveredProducts(pool, owner, {
      storeId: fixture.storeId,
      productIds: [fixture.ids[0]],
    }),
  ).rejects.toThrow();
  await pool.query(
    "UPDATE legacy_product_recoveries SET status='review' WHERE run_id=$1 AND product_id=$2",
    [LEGACY_CATALOG_RUN, fixture.ids[1]],
  );
  expect(await recoveredProduct(pool, owner, fixture.ids[1]!)).toBeNull();
  await expect(
    importRecoveredProducts(pool, owner, {
      storeId: fixture.storeId,
      productIds: [fixture.ids[1]],
    }),
  ).rejects.toThrow();
  const {
    rows: [counts],
  } = await pool.query(
    'SELECT (SELECT count(*) FROM assistant_publication_items) publications,(SELECT count(*) FROM stores WHERE user_id=$1) current_stores',
    [owner],
  );
  expect(Number(counts.publications)).toBe(0);
  expect(Number(counts.current_stores)).toBe(0);
  await pool.query('DELETE FROM "user" WHERE id=$1', [owner]);
  expect(
    (await pool.query('SELECT * FROM legacy_catalog_imports WHERE user_id=$1', [owner])).rows,
  ).toHaveLength(0);
});
