import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { importLegacyStores, type readLegacyImport } from '../../scripts/import-legacy-stores';
import { validateLegacySnapshot } from '../../src/features/legacy-stores/model';
import { getLegacyStoreForUser } from '../../src/features/legacy-stores/server/queries';
import { db } from '../../src/server/db';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const ids = Array.from({ length: 5 }, () => randomUUID());
const customers = ids.map((id, index) => ({
  id: randomUUID(),
  nome: `Student ${index}`,
  email: `${id}@example.invalid`,
  telefone: null,
}));
const stores = customers.map((c) => ({
  id: randomUUID(),
  cliente_id: c.id,
  nome: 'Original store',
  descricao: 'Original description',
  shopee_shop_id: '123',
  shopee_nome: 'Original Shopee name',
  loja_shopee_vinculada_id: null as string | null,
  situacao_entrega: 'entrega_registrada',
  pendencias: [],
}));
const snapshot = validateLegacySnapshot({
  customers,
  stores,
  products: [
    {
      id: randomUUID(),
      loja_id: stores[0]!.id,
      titulo: 'Original item',
      descricao: 'Original detail',
      preco_final: 19.99,
      shopee_item_id: '456',
      situacao_publicacao: 'publicado',
      situacao_anuncio_shopee: 'NORMAL',
    },
  ],
  purchases: customers.map((c, i) => ({
    transacao_id: `HP-${c.id}`,
    cliente_id: c.id,
    loja_id: stores[i]!.id,
  })),
});
const importId = randomUUID();
const sllCode = `legacy-sll-${randomUUID()}`;
const input = {
  snapshot,
  id: importId,
  manifest: { project: 'voslzzgajgatdcrueikw', exportedAt: new Date().toISOString(), tables: {} },
} as Awaited<ReturnType<typeof readLegacyImport>>;

afterAll(async () => {
  await pool.query('DELETE FROM hotmart_purchases WHERE product_ucode=$1', [sllCode]);
  await pool.query('DELETE FROM hotmart_product_mappings WHERE product_ucode=$1', [sllCode]);
  await pool.query('DELETE FROM legacy_purchase_references WHERE customer_id=ANY($1::uuid[])', [
    customers.map((c) => c.id),
  ]);
  await pool.query('DELETE FROM legacy_store_products WHERE store_id=ANY($1::uuid[])', [
    stores.map((s) => s.id),
  ]);
  await pool.query('DELETE FROM legacy_stores WHERE id=ANY($1::uuid[])', [stores.map((s) => s.id)]);
  await pool.query('DELETE FROM legacy_customers WHERE id=ANY($1::uuid[])', [
    customers.map((c) => c.id),
  ]);
  await pool.query('DELETE FROM legacy_store_imports WHERE id=$1', [importId]);
  await pool.query('DELETE FROM "user" WHERE email=ANY($1::text[])', [
    customers.map((c) => c.email),
  ]);
  await pool.end();
  await db.$client.end();
});

test('imports real records atomically, preserves accounts, respects ownership and never replays grants', async () => {
  // Existing student, blocked student, revoked student, administrator, and one missing student.
  for (let index = 0; index < 4; index++) {
    await pool.query(
      `INSERT INTO "user"(id,name,email,role,banned,must_change_password,email_verified)
      VALUES($1,'Existing name',$2,$3,$4,false,true)`,
      [ids[index], customers[index]!.email, index === 3 ? 'admin' : 'user', index === 1],
    );
    await pool.query(
      `INSERT INTO account(id,account_id,provider_id,user_id,password,updated_at)
      VALUES($1,$2,'credential',$2,'preserved-personal-hash',now())`,
      [randomUUID(), ids[index]],
    );
  }
  await pool.query(
    `INSERT INTO store_brand(user_id,name,description) VALUES($1,'Current brand','Current description')`,
    [ids[0]],
  );
  await pool.query(
    `INSERT INTO product_access_events(id,target_user_id,product,action,reason)
    VALUES($1,$2,'loja-pronta','revoked','Owner decision')`,
    [randomUUID(), ids[2]],
  );
  // Refunding another product must not suppress a legitimate Loja Pronta membership.
  await pool.query("INSERT INTO hotmart_product_mappings(product_ucode,access) VALUES($1,'sll')", [
    sllCode,
  ]);
  await pool.query(
    `INSERT INTO hotmart_purchases(transaction,buyer_email,product_ucode,user_id,active,last_event_at)
    VALUES($1,$2,$3,$4,false,now())`,
    [`HP-${randomUUID()}`, customers[0]!.email, sllCode, ids[0]],
  );

  const preview = await importLegacyStores(pool, input, false);
  expect(preview.newAccounts).toBe(1);
  expect(
    (await pool.query('SELECT id FROM legacy_store_imports WHERE id=$1', [importId])).rowCount,
  ).toBe(0);

  // A conflicting historical record must roll back account creation and every preceding insert.
  await pool.query(`INSERT INTO legacy_customers(id,user_id,record) VALUES($1,$2,$3::jsonb)`, [
    customers[0]!.id,
    ids[0],
    JSON.stringify({ ...customers[0], nome: 'Conflicting record' }),
  ]);
  await expect(importLegacyStores(pool, input, true)).rejects.toThrow('Imported records differ');
  expect(
    (await pool.query('SELECT id FROM "user" WHERE email=$1', [customers[4]!.email])).rowCount,
  ).toBe(0);
  expect(
    (
      await pool.query('SELECT id FROM legacy_stores WHERE id=ANY($1::uuid[])', [
        stores.map((s) => s.id),
      ])
    ).rowCount,
  ).toBe(0);
  await pool.query('DELETE FROM legacy_customers WHERE id=$1', [customers[0]!.id]);

  const result = await importLegacyStores(pool, input, true);
  expect(result).toEqual({ alreadyImported: false, newAccounts: 1, granted: 0, skipped: 5 });
  expect(
    (await pool.query('SELECT * FROM manual_product_grants WHERE user_id=ANY($1::text[])', [ids]))
      .rowCount,
  ).toBe(0);
  const { rows: accounts } = await pool.query(
    `SELECT u.id,u.email,u.name,u.role,u.banned,u.must_change_password,a.password
    FROM "user" u JOIN account a ON a.user_id=u.id WHERE u.email=ANY($1::text[])`,
    [customers.map((c) => c.email)],
  );
  expect(accounts).toHaveLength(5);
  for (let index = 0; index < 4; index++) {
    const account = accounts.find((a) => a.id === ids[index]);
    expect(account.password).toBe('preserved-personal-hash');
    expect(account.name).toBe('Existing name');
  }
  expect(accounts.find((a) => a.id === ids[1]).banned).toBe(true);
  expect(accounts.find((a) => a.id === ids[3]).role).toBe('admin');
  const created = accounts.find((a) => a.email === customers[4]!.email);
  const { verifyPassword } = await import('better-auth/crypto');
  expect(await verifyPassword({ hash: created.password, password: 'loja1234' })).toBe(true);
  expect(created.must_change_password).toBe(false);
  expect(
    (await pool.query('SELECT name FROM store_brand WHERE user_id=$1', [ids[0]])).rows[0].name,
  ).toBe('Current brand');

  const ownStore = await getLegacyStoreForUser(ids[0]!, stores[0]!.id);
  expect(ownStore?.total).toBe(1);
  expect(ownStore?.products[0]?.record.preco_final).toBe(19.99);
  expect(await getLegacyStoreForUser(ids[1]!, stores[0]!.id)).toBeNull();
  // Even a manually corrupted link cannot expose another account's products.
  await pool.query(
    `UPDATE legacy_stores SET record=jsonb_set(record,'{loja_shopee_vinculada_id}',to_jsonb($1::text)) WHERE id=$2`,
    [stores[0]!.id, stores[1]!.id],
  );
  expect((await getLegacyStoreForUser(ids[1]!, stores[1]!.id))?.total).toBe(0);
  await pool.query('UPDATE legacy_stores SET record=$1::jsonb WHERE id=$2', [
    JSON.stringify(stores[1]),
    stores[1]!.id,
  ]);

  await pool.query("DELETE FROM student_products WHERE user_id=$1 AND product='loja-pronta'", [
    created.id,
  ]);
  expect((await importLegacyStores(pool, input, true)).alreadyImported).toBe(true);
  expect(
    (
      await pool.query(
        "SELECT user_id FROM student_products WHERE user_id=$1 AND product='loja-pronta'",
        [created.id],
      )
    ).rowCount,
  ).toBe(0);
}, 30000);
