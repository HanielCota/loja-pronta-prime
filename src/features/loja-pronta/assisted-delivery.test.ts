import { expect, test } from 'bun:test';
import JSZip from 'jszip';
import {
  deliveryApprovalFingerprint,
  prepareDeliveryOffer,
  shopeeDeliveryShopId,
} from './assisted-delivery';
import { fillDeliveryWorkbook, parseDeliveryWorkbookLayout } from './delivery-workbook';

const now = new Date('2026-11-07T12:00:00Z');
const product = {
  supplierId: 'supplier',
  sku: '001',
  title: '=A1 & A2',
  description: 'Product description',
  images: ['https://example.com/photo.jpg'],
  costCents: 1000,
  priceCents: 2190,
  stock: 3,
  weightGrams: 500,
  dimensionsCm: { length: 10, width: 20, height: 5 },
  updatedAt: now.toISOString(),
  marketplace: { categoryId: 100 },
  variants: [],
};

const layout = parseDeliveryWorkbookLayout(
  JSON.stringify({
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
)!;

async function template(existingCell = '') {
  const zip = new JSZip();
  zip.file('xl/workbook.xml', '<workbook/>');
  zip.file(
    'xl/sharedStrings.xml',
    '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>SKU</t></si></sst>',
  );
  zip.file(
    'xl/worksheets/sheet1.xml',
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
    <row r="2"><c r="A2" t="s"><v>0</v></c></row>
    <row r="3"><c r="A3" s="2">${existingCell}</c></row>
  </sheetData></worksheet>`,
  );
  zip.file('xl/worksheets/sheet2.xml', '<instructions/>');
  return zip.generateAsync({ type: 'uint8array' });
}

test('accepts canonical Shopee stores only', () => {
  expect(shopeeDeliveryShopId('https://www.shopee.com.br/shop/123/?share=yes')).toBe('123');
  expect(shopeeDeliveryShopId('https://shopee.com.br.bad.example/shop/123')).toBeNull();
  expect(shopeeDeliveryShopId('https://shopee.com.br:1234/shop/123')).toBeNull();
  expect(shopeeDeliveryShopId('https://shopee.com.br/shop/9999999999999999')).toBeNull();
});

test('requires fresh compatible offers and pins approved data while using current stock', () => {
  const original = prepareDeliveryOffer(product, now)!;
  expect(prepareDeliveryOffer({ ...product, stock: 0 }, now)).toBeNull();
  expect(prepareDeliveryOffer({ ...product, marketplace: undefined }, now)).toBeNull();
  expect(prepareDeliveryOffer(product, new Date(now.getTime() + 16 * 60_000))).toBeNull();
  const changedStock = prepareDeliveryOffer({ ...product, stock: 2 }, now)!;
  const changedPrice = prepareDeliveryOffer({ ...product, priceCents: 2300 }, now)!;
  expect(changedStock.fingerprint).toBe(original.fingerprint);
  expect(changedStock.stock).toBe(2);
  expect(deliveryApprovalFingerprint('brand', [changedPrice])).not.toBe(
    deliveryApprovalFingerprint('brand', [original]),
  );
});

test('writes five listings in the original template and retains styles and other sheets', async () => {
  const offers = Array.from({ length: 5 }, (_, index) =>
    prepareDeliveryOffer(
      {
        ...product,
        sku: `00${index + 1}`,
      },
      now,
    )!,
  );
  const result = await JSZip.loadAsync(
    await fillDeliveryWorkbook(await template(), layout, offers),
  );
  const sheet = await result.file(layout.worksheet)?.async('string');
  expect(sheet).toContain('<c r="A3" s="2" t="inlineStr"><is><t xml:space="preserve">001</t>');
  expect(sheet).toContain('=A1 &amp; A2');
  expect(sheet).toContain('<c r="E3" t="n"><v>21.9</v></c>');
  expect(sheet).toContain('<c r="G3" t="n"><v>0.5</v></c>');
  expect(sheet).toContain('<c r="K7" t="inlineStr">');
  expect(sheet).not.toContain('<f>');
  expect(await result.file('xl/worksheets/sheet2.xml')?.async('string')).toBe('<instructions/>');
});

test('refuses a different template or a product cell with existing data', async () => {
  const offer = prepareDeliveryOffer(product, now)!;
  await expect(
    fillDeliveryWorkbook(
      await template(),
      {
        ...layout,
        anchor: { cell: 'A2', text: 'Different' },
      },
      [offer],
    ),
  ).rejects.toThrow('Unexpected workbook template.');
  await expect(fillDeliveryWorkbook(await template('<v>1</v>'), layout, [offer])).rejects.toThrow(
    'contains a value',
  );
});
