import { afterAll, expect, mock, test } from 'bun:test';
import JSZip from 'jszip';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  manualProductGrants,
  storeBrand,
  stores,
  studentProducts,
  supplierCatalog,
  user,
} from '@/server/db/schema';
import { brandFingerprint } from '@/features/brand/server/fingerprint';
import { deliveryApprovalFingerprint } from '@/features/loja-pronta/assisted-delivery';

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
  deliveryMemberAccess,
  deliveryReconciliationFingerprint,
  ownAssistedDelivery,
  requestAssistedDelivery,
} = await import('@/features/loja-pronta/server/assisted-delivery');

const supplierId = 'access-test-supplier';
const studentId = 'assisted-access-student';
const operatorId = 'assisted-access-operator';
const shopId = '987654';

afterAll(async () => {
  await db.delete(supplierCatalog).where(eq(supplierCatalog.supplierId, supplierId));
  for (const id of [studentId, operatorId]) await db.delete(user).where(eq(user.id, id));
  await db.$client.end();
});

test('the first request keeps the member access encrypted until the delivery ends', async () => {
  Object.assign(process.env, {
    SHOPEE_ASSISTED_DELIVERY_ENABLED: 'true',
    SHOPEE_PUBLICATION_ENABLED: 'false',
    SHOPEE_BRAND_PUBLICATION_ENABLED: 'false',
    SHOPEE_ASSISTED_PILOT_USER_ID: studentId,
    SHOPEE_ASSISTED_PILOT_SHOP_URL: `https://shopee.com.br/shop/${shopId}`,
    SHOPEE_ASSISTED_TEMPLATE_KEY: 'shopee-templates/access-test.xlsx',
    SHOPEE_ASSISTED_SUPPLIER_ID: supplierId,
    SHOPEE_ASSISTED_TEMPLATE_LAYOUT: JSON.stringify({
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
    }),
  });
  await db
    .insert(user)
    .values(
      [studentId, operatorId].map((id) => ({ id, name: id, email: `${id}@example.invalid` })),
    );
  await db.insert(studentProducts).values({ userId: studentId, product: 'loja-pronta' });
  await db.insert(manualProductGrants).values({ userId: studentId, product: 'loja-pronta' });
  await db.insert(stores).values({ userId: studentId, phase: 4 });
  const brand = { name: 'Acesso', description: 'Descrição', logoImage: 'logos/access/logo.png' };
  await db.insert(storeBrand).values({
    userId: studentId,
    ...brand,
    completedAt: new Date(),
    publicationFingerprint: brandFingerprint(brand),
  });
  const now = new Date();
  const products = Array.from({ length: 5 }, (_, index) => ({
    supplierId,
    sku: `access-${index}`,
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

  const review = await assistedDeliveryReview(studentId);
  const approval = deliveryApprovalFingerprint(review.brand!.fingerprint, review.offers);
  // Sem o acesso de membro, o primeiro pedido não entra na fila.
  expect(await requestAssistedDelivery(studentId, shopId, approval)).toBe(false);
  const access = { login: 'minhaloja:entrega', password: 'Senha@123' };
  expect(await requestAssistedDelivery(studentId, shopId, approval, access)).toBe(true);

  const saved = (await ownAssistedDelivery(studentId))!;
  expect(saved.memberLogin).toBe(access.login);
  expect(saved.memberPassword).not.toContain(access.password);
  expect(deliveryMemberAccess(saved)).toEqual(access);
  // Copiada pra outra loja, a senha cifrada não abre.
  expect(deliveryMemberAccess({ ...saved, shopId: '111' })).toEqual({
    login: access.login,
    password: null,
  });

  expect(await claimAssistedDelivery(saved.id, operatorId)).toBe(true);
  const claimed = (await ownAssistedDelivery(studentId))!;
  expect(
    await confirmAssistedItems(
      saved.id,
      operatorId,
      deliveryReconciliationFingerprint(claimed),
      ['11', '22', '33', '44', '55'],
      true,
    ),
  ).toBe(true);
  const done = (await ownAssistedDelivery(studentId))!;
  expect(done.completedAt).toBeInstanceOf(Date);
  expect(done.memberPassword).toBeNull();
  expect(done.memberLogin).toBe(access.login);
});
