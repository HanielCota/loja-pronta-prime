import { expect, test } from 'bun:test';
import { configuredSupplierSources, supplierFeedSnapshotSchema } from './supplier-feed';

test('valida configuração sem divulgar ou aceitar tokens embutidos na URL', () => {
  const value = {
    id: 'supplier',
    name: 'Fornecedor',
    url: 'https://supplier.example.com/catalog',
    tokenEnv: 'SUPPLIER_REAL_TOKEN',
    imageHosts: ['images.example.com'],
  };
  expect(configuredSupplierSources(JSON.stringify([value]))[0]?.intervalSeconds).toBe(300);
  expect(() => configuredSupplierSources(JSON.stringify([value, value]))).toThrow();
  expect(() =>
    configuredSupplierSources(
      JSON.stringify([{ ...value, url: 'https://token@supplier.example.com/catalog' }]),
    ),
  ).toThrow();
  expect(() =>
    configuredSupplierSources(JSON.stringify([{ ...value, intervalSeconds: 1 }])),
  ).toThrow();
});
test('uma página parcial não pode zerar os produtos ausentes de um catálogo completo', () => {
  expect(
    supplierFeedSnapshotSchema.safeParse({
      generatedAt: new Date().toISOString(),
      complete: false,
      products: [],
    }).success,
  ).toBe(false);
  expect(
    supplierFeedSnapshotSchema.safeParse({
      generatedAt: new Date().toISOString(),
      complete: true,
      products: [],
    }).success,
  ).toBe(true);
});

test('o SKU de uma variação não pode identificar outro produto do mesmo catálogo', () => {
  const time = new Date().toISOString();
  const product = {
    supplierId: 'supplier',
    sku: 'one',
    title: 'Produto',
    description: 'Descrição',
    images: ['https://images.example.com/a.png'],
    costCents: 1000,
    priceCents: 2000,
    stock: 2,
    weightGrams: 100,
    dimensionsCm: { length: 10, width: 10, height: 10 },
    updatedAt: time,
    variants: [],
  };
  expect(
    supplierFeedSnapshotSchema.safeParse({
      generatedAt: time,
      complete: true,
      products: [
        {
          ...product,
          variants: [
            { sku: 'two', options: { Cor: 'Azul' }, costCents: 1000, priceCents: 2000, stock: 2 },
          ],
        },
        { ...product, sku: 'two' },
      ],
    }).success,
  ).toBe(false);
});
