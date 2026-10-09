import { describe, expect, it } from 'bun:test';
import { prepareSupplierProduct } from './catalog';

const now = new Date('2026-10-09T12:00:00Z');
const product = {
  supplierId: 'test',
  sku: 'test-1',
  title: 'Produto de teste',
  description: 'Somente teste unitário',
  images: ['https://example.com/test.jpg'],
  costCents: 1000,
  priceCents: 2000,
  stock: 3,
  weightGrams: 200,
  dimensionsCm: { length: 10, width: 10, height: 10 },
  updatedAt: now.toISOString(),
  variants: [],
};

describe('preparação do catálogo', () => {
  it('prepara dados completos sem afirmar que foram publicados', () => {
    expect(prepareSupplierProduct(product, now).status).toBe('prepared');
  });
  it('rejeita valores fracionados e imagens inseguras', () => {
    expect(prepareSupplierProduct({ ...product, priceCents: 20.5 }, now).status).toBe('invalid');
    expect(
      prepareSupplierProduct({ ...product, images: ['http://example.com/test.jpg'] }, now).status,
    ).toBe('invalid');
  });
  it('bloqueia estoque antigo, futuro, esgotado e venda abaixo do custo', () => {
    for (const change of [
      { updatedAt: '2026-10-08T12:00:00Z' },
      { updatedAt: '2026-10-10T12:00:00Z' },
      { stock: 0 },
      { priceCents: 900 },
    ])
      expect(prepareSupplierProduct({ ...product, ...change }, now).status).toBe('blocked');
  });
  it('confere estoque e preço das variações e rejeita SKU duplicado', () => {
    const variant = {
      sku: 'test-2',
      options: { Cor: 'Azul' },
      costCents: 1000,
      priceCents: 2000,
      stock: 0,
    };
    expect(prepareSupplierProduct({ ...product, variants: [variant] }, now).status).toBe('blocked');
    expect(prepareSupplierProduct({ ...product, variants: [variant, variant] }, now).status).toBe(
      'invalid',
    );
  });
});
