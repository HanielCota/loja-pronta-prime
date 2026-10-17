import { afterAll, beforeAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  user,
  shopeeConnections,
  supplierCatalog,
  supplierPublicationMappings,
} from '@/server/db/schema';
import { publicationPayloadSchema } from '@/features/assistant/model';

const adminId = randomUUID(),
  studentId = randomUUID(),
  supplierId = randomUUID();
mock.module('@/features/admin/server/access', () => ({
  requireAdmin: async () => ({ user: { id: adminId } }),
}));
mock.module('next/cache', () => ({ revalidatePath: () => {} }));
mock.module('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
const { importSupplierCatalog } = await import('@/features/assistant/server/admin-actions');
beforeAll(async () => {
  for (const id of [adminId, studentId])
    await db.insert(user).values({ id, name: 'Importação', email: `${id}@example.invalid` });
  await db.insert(shopeeConnections).values({
    userId: studentId,
    shopId: 88099999,
    applicationId: 'live:123',
    accessTokenEncrypted: 'unused-in-catalog-import',
    refreshTokenEncrypted: 'unused-in-catalog-import',
    accessTokenExpiresAt: new Date(Date.now() + 3600000),
  });
});
afterAll(async () => {
  for (const id of [studentId, adminId]) await db.delete(user).where(eq(user.id, id));
  await db.delete(supplierCatalog).where(eq(supplierCatalog.supplierId, supplierId));
  await db.$client.end();
});
function record(sku: string, time: Date, price = 20, stock = 10) {
  return {
    product: {
      supplierId,
      sku,
      title: 'Produto',
      description: 'Descrição',
      images: ['https://example.invalid/product.jpg'],
      costCents: 1000,
      priceCents: price * 100,
      stock,
      weightGrams: 200,
      dimensionsCm: { length: 10, width: 10, height: 10 },
      updatedAt: time.toISOString(),
      variants: [],
    },
    publication: publicationPayloadSchema.parse({
      item_name: 'Produto',
      description: 'Descrição',
      category_id: 10,
      item_sku: sku,
      original_price: price,
      normal_stock: 2,
      weight: 0.2,
      condition: 'NEW',
      item_status: 'NORMAL',
      image: { image_id_list: ['image-id'] },
      dimension: { package_length: 10, package_width: 10, package_height: 10 },
      logistic_info: [{ logistic_id: 1, enabled: true, is_free: false }],
      brand: { brand_id: 0, original_brand_name: 'NoBrand' },
    }),
  };
}
function form(row: ReturnType<typeof record>) {
  const data = new FormData();
  data.set(
    'catalog',
    new File([JSON.stringify([row])], 'catalog.json', { type: 'application/json' }),
  );
  data.set('targetUserId', studentId);
  data.set('confirmed', 'true');
  return data;
}
test('arquivo antigo ou conflitante não substitui preço, estoque ou preparação mais recentes', async () => {
  const now = Date.now();
  const current = record('ordered', new Date(now - 100), 25, 3);
  await expect(importSupplierCatalog(form(current))).rejects.toThrow('resultado=saved');
  await expect(
    importSupplierCatalog(form(record('ordered', new Date(now - 200), 20, 10))),
  ).rejects.toThrow('resultado=outdated');
  await expect(
    importSupplierCatalog(form(record('ordered', new Date(now - 100), 22, 8))),
  ).rejects.toThrow('resultado=outdated');
  const [catalog] = await db
    .select()
    .from(supplierCatalog)
    .where(eq(supplierCatalog.sku, 'ordered'));
  const [mapping] = await db
    .select()
    .from(supplierPublicationMappings)
    .where(eq(supplierPublicationMappings.sku, 'ordered'));
  expect(catalog?.product).toMatchObject({ priceCents: 2500, stock: 3 });
  expect(mapping?.payload.original_price).toBe(25);
  await expect(
    importSupplierCatalog(form(record('ordered', new Date(Date.now() + 86400000), 30, 5))),
  ).rejects.toThrow('resultado=invalid');
  // Corrigir categoria/atributos sem alterar a versão do fornecedor continua permitido.
  await expect(
    importSupplierCatalog(
      form({ ...current, publication: { ...current.publication, category_id: 20 } }),
    ),
  ).rejects.toThrow('resultado=saved');
  expect(
    (
      await db
        .select()
        .from(supplierPublicationMappings)
        .where(eq(supplierPublicationMappings.sku, 'ordered'))
    )[0]?.payload.category_id,
  ).toBe(20);
});
test('importações concorrentes preservam a versão mais recente do fornecedor', async () => {
  const now = Date.now();
  const older = record('concurrent', new Date(now - 200), 20, 10),
    newer = record('concurrent', new Date(now - 100), 25, 3);
  await Promise.allSettled([
    importSupplierCatalog(form(newer)),
    importSupplierCatalog(form(older)),
  ]);
  const [catalog] = await db
    .select()
    .from(supplierCatalog)
    .where(eq(supplierCatalog.sku, 'concurrent'));
  const [mapping] = await db
    .select()
    .from(supplierPublicationMappings)
    .where(eq(supplierPublicationMappings.sku, 'concurrent'));
  expect(catalog?.product).toMatchObject({ priceCents: 2500, stock: 3 });
  expect(mapping?.payload.original_price).toBe(25);
});
