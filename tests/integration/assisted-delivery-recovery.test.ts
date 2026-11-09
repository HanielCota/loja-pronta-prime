import { afterAll, expect, mock, test } from 'bun:test';
import JSZip from 'jszip';
import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  assistedDeliveries,
  manualProductGrants,
  studentProducts,
  supplierCatalog,
  user,
} from '@/server/db/schema';
import {
  deliveryApprovalFingerprint,
  prepareDeliveryOffer,
} from '@/features/loja-pronta/assisted-delivery';

const zip = new JSZip();
zip.file('xl/workbook.xml', '<workbook/>');
zip.file(
  'xl/worksheets/sheet1.xml',
  '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="2"><c r="A2" t="inlineStr"><is><t>SKU</t></is></c></row></sheetData></worksheet>',
);
const template = await zip.generateAsync({ type: 'uint8array' });
mock.module('@/server/storage', () => ({ storage: () => ({ get: async () => template }) }));
const {
  assistedDeliveryReview,
  claimAssistedDelivery,
  confirmAssistedItems,
  deliveryReadiness,
  deliveryReconciliationFingerprint,
  deliveryWorkbook,
  ownAssistedDelivery,
  releaseAssistedDelivery,
  requestAssistedDelivery,
} = await import('@/features/loja-pronta/server/assisted-delivery');

const supplierId = 'recovery-test-supplier';
const studentId = 'assisted-recovery-student';
const operatorId = 'assisted-recovery-operator';
const replacementId = 'assisted-recovery-replacement';
const people = [studentId, operatorId, replacementId];

afterAll(async () => {
  await db.delete(supplierCatalog).where(eq(supplierCatalog.supplierId, supplierId));
  for (const id of people) await db.delete(user).where(eq(user.id, id));
  await db.$client.end();
});

test('a claimed delivery can recover changed offers and keep confirmed listings', async () => {
  process.env.SHOPEE_ASSISTED_SUBACCOUNT = 'recovery-test-subaccount';
  process.env.SHOPEE_ASSISTED_TEMPLATE_KEY = 'shopee-templates/recovery-test.xlsx';
  process.env.SHOPEE_ASSISTED_SUPPLIER_ID = supplierId;
  process.env.SHOPEE_ASSISTED_TEMPLATE_LAYOUT = JSON.stringify({
    worksheet: 'xl/worksheets/sheet1.xml',
    firstRow: 3,
    anchor: { cell: 'A2', text: 'SKU' },
    columns: {
      sku: 'A',
      title: 'B',
      description: 'C',
      category: 'D',
      price: 'E',
      stock: 'F',
      weight: 'G',
      length: 'H',
      width: 'I',
      height: 'J',
      images: ['K'],
    },
  });
  await db
    .insert(user)
    .values(people.map((id) => ({ id, name: id, email: `${id}@example.invalid` })));
  await db.insert(studentProducts).values({ userId: studentId, product: 'loja-pronta' });
  await db.insert(manualProductGrants).values({ userId: studentId, product: 'loja-pronta' });
  const now = new Date();
  const products = Array.from({ length: 6 }, (_, index) => ({
    supplierId,
    sku: `product-${index}`,
    title: 'Sample product',
    description: 'Product description',
    images: ['https://example.invalid/photo.jpg'],
    costCents: 1000,
    priceCents: 2190,
    stock: 3,
    weightGrams: 500,
    dimensionsCm: { length: 10, width: 20, height: 5 },
    updatedAt: now.toISOString(),
    marketplace: { categoryId: 100, brandId: 0, attributes: [] },
    variants: [],
  }));
  await db
    .insert(supplierCatalog)
    .values(products.map((product) => ({ supplierId, sku: product.sku, product, updatedAt: now })));
  const selection = products.slice(0, 5).map((product) => {
    const { sku, fingerprint } = prepareDeliveryOffer(product, now)!;
    return { supplierId, sku, fingerprint };
  });
  const [delivery] = await db
    .insert(assistedDeliveries)
    .values({
      userId: studentId,
      shopId: '123',
      operatorId,
      startedAt: now,
      brand: {
        name: 'Review',
        description: 'Review description',
        logoImage: 'logos/review/review.png',
        fingerprint: 'review-brand',
      },
      selection,
      itemIds: [null, '1234', null, null, null],
    })
    .returning();
  const id = delivery!.id;
  expect(await deliveryReadiness(delivery!)).toBe('ready');
  const unavailable = products[0]!;
  await db
    .update(supplierCatalog)
    .set({ product: { ...unavailable, stock: 0 } })
    .where(
      and(eq(supplierCatalog.sku, unavailable.sku), eq(supplierCatalog.supplierId, supplierId)),
    );
  expect(await deliveryReadiness(delivery!)).toBe('offers');
  expect(await deliveryWorkbook(delivery!)).toBeNull();
  const oldForm = deliveryReconciliationFingerprint(delivery!);
  expect(
    await confirmAssistedItems(id, replacementId, oldForm, [null, null, null, null, '5678'], false),
  ).toBe(false);
  expect(
    await confirmAssistedItems(
      id,
      replacementId,
      oldForm,
      [null, null, null, null, '5678'],
      false,
      true,
    ),
  ).toBe(true);
  expect(await releaseAssistedDelivery(id, oldForm, true)).toBe(false);
  const snapshot = async () =>
    deliveryReconciliationFingerprint((await ownAssistedDelivery(studentId))!);
  expect(await releaseAssistedDelivery(id, await snapshot(), true)).toBe(true);
  expect(await claimAssistedDelivery(id, replacementId)).toBe(false);
  expect(await confirmAssistedItems(id, operatorId, await snapshot(), ['4321'], false)).toBe(false);

  const pending = (await ownAssistedDelivery(studentId))!;
  const { brand, offers } = await assistedDeliveryReview(studentId, pending);
  expect(offers.map(({ sku }) => sku)).toEqual(['product-2', 'product-3', 'product-5']);
  expect(
    await requestAssistedDelivery(
      studentId,
      '123',
      deliveryApprovalFingerprint(brand!.fingerprint, offers),
    ),
  ).toBe(false);
  const approval = deliveryApprovalFingerprint(brand!.fingerprint, offers, pending.offerReviewId!);
  expect(await requestAssistedDelivery(studentId, '124', approval)).toBe(false);
  expect(await requestAssistedDelivery(studentId, '123', approval)).toBe(true);
  expect(await requestAssistedDelivery(studentId, '123', approval)).toBe(false);
  const updated = (await ownAssistedDelivery(studentId))!;
  expect(updated.brand).toEqual(delivery!.brand);
  expect(updated.itemIds).toEqual([null, '1234', null, null, '5678']);
  expect(updated.selection[1]).toEqual(selection[1]);
  expect(updated.offerReviewId).toBeNull();
  expect(await claimAssistedDelivery(id, replacementId)).toBe(true);
  expect(await releaseAssistedDelivery(id, await snapshot(), false)).toBe(true);
  expect(await claimAssistedDelivery(id, operatorId)).toBe(true);
  expect(
    await confirmAssistedItems(id, operatorId, oldForm, ['1111', null, '2222', '3333'], true),
  ).toBe(false);
  expect(
    await confirmAssistedItems(
      id,
      operatorId,
      await snapshot(),
      ['1111', null, '2222', '3333'],
      true,
    ),
  ).toBe(true);
  expect((await ownAssistedDelivery(studentId))!.completedAt).toBeInstanceOf(Date);
});
