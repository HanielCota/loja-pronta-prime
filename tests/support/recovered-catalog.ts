import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { LEGACY_CATALOG_RUN } from '../../src/config/legacy-catalog';
import {
  legacyRecordHash,
  recoveryHash,
  validateRecoveredItem,
  type RecoverySource,
} from '../../src/features/legacy-stores/recovery';

export const fixtureImage = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7S0AAAAASUVORK5CYII=',
  'base64',
);
export async function seedRecoveredCatalog(pool: Pool, userId: string, count = 2) {
  const customerId = randomUUID(),
    storeId = randomUUID(),
    sha = recoveryHash(fixtureImage);
  const description =
    'Comfortable shoes with a soft sole and washable fabric. Each option uses the same materials and construction, with sizes listed below.';
  const source: RecoverySource = {
    shopId: 123,
    catalogSha256: 'a'.repeat(64),
    capturedAt: '2026-10-26T10:00:00Z',
    shopName: 'Test store',
    images: {
      shopId: 123,
      catalogSha256: 'a'.repeat(64),
      assets: [
        {
          url: 'https://cf.shopee.com.br/file/test',
          key: `recovery/shopee/images/sha256/${sha}`,
          sha256: sha,
          bytes: fixtureImage.length,
          contentType: 'image/png',
          checksumVerified: true,
        },
      ],
    },
    items: [],
  };
  const base = validateRecoveredItem(
    {
      item_id: 456,
      item_name: 'Recovered shoes',
      description,
      category_id: 10,
      item_status: 'NORMAL',
      has_model: true,
      weight: '0.5',
      dimension: { package_length: 20, package_width: 12, package_height: 8 },
      image: { image_url_list: ['https://cf.shopee.com.br/file/test'] },
      recovered_models: {
        tier_variation: [{ name: 'Tamanho', option_list: [{ option: '35' }, { option: '36' }] }],
        model: [
          { model_id: 1, tier_index: [0], model_sku: 'SHOE-35' },
          { model_id: 2, tier_index: [1], model_sku: 'SHOE-36' },
        ],
      },
    },
    source,
  );
  await pool.query(
    'INSERT INTO legacy_catalog_recovery_runs(id,manifest_key,manifest_sha256,source_product_count,counts,applied_at) VALUES($1,$2,$3,2,$4,now()) ON CONFLICT DO NOTHING',
    [
      LEGACY_CATALOG_RUN,
      'test/manifest.json',
      'b'.repeat(64),
      { recovered: 2, review: 0, unmatched: 0, protected: 0 },
    ],
  );
  await pool.query(
    'INSERT INTO legacy_catalog_products(run_id,id,product) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
    [LEGACY_CATALOG_RUN, base.id, base],
  );
  await pool.query('INSERT INTO legacy_customers(id,user_id,record) VALUES($1,$2,$3)', [
    customerId,
    userId,
    {
      id: customerId,
      nome: 'Test account',
      email: `${customerId}@example.invalid`,
      telefone: null,
    },
  ]);
  await pool.query('INSERT INTO legacy_stores(id,customer_id,record) VALUES($1,$2,$3)', [
    storeId,
    customerId,
    {
      id: storeId,
      cliente_id: customerId,
      nome: 'Loja recuperada de teste',
      descricao: 'Test store',
      shopee_shop_id: '123',
      shopee_nome: 'Test store',
      loja_shopee_vinculada_id: null,
      situacao_entrega: 'entrega_registrada',
      pendencias: [],
    },
  ]);
  const ids: string[] = [];
  for (let index = 0; index < count; index++) {
    const id = randomUUID();
    ids.push(id);
    const record = {
      id,
      loja_id: storeId,
      titulo: `Recovered shoes ${index + 1}`,
      descricao: description,
      preco_final: 49.9,
      shopee_item_id: '456',
      situacao_publicacao: 'publicado',
      situacao_anuncio_shopee: 'NORMAL',
    };
    await pool.query('INSERT INTO legacy_store_products(id,store_id,record) VALUES($1,$2,$3)', [
      id,
      storeId,
      record,
    ]);
    await pool.query(
      'INSERT INTO legacy_product_recoveries(run_id,product_id,store_id,user_id,base_product_id,source_hash,status,method,reasons) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [
        LEGACY_CATALOG_RUN,
        id,
        storeId,
        userId,
        base.id,
        legacyRecordHash(record),
        'recovered',
        'shop_item_id',
        [],
      ],
    );
  }
  return { storeId, customerId, ids, base };
}
