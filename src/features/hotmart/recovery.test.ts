import { expect, test } from 'bun:test';
import { hotmartEventForReplay, isRetryableHotmartResult } from './recovery';
import { parseHotmartEvent } from './event';

const record = {
  id: 'original-event',
  event: 'PURCHASE_APPROVED',
  transaction: 'original-transaction',
  buyerEmail: 'student@example.invalid',
  buyerName: 'Student',
  productUcode: 'original-product',
  productId: 12345,
  productName: 'Original product',
  eventVersion: '2.0.0',
  eventCreatedAt: new Date('2026-10-10T12:00:00Z'),
  orderedAt: new Date('2026-10-09T12:00:00Z'),
};

test('recovery preserves provider identity and original dates', () => {
  const event = hotmartEventForReplay(record);
  expect(event?.id).toBe(record.id);
  expect(event?.creation_date).toBe(record.eventCreatedAt.getTime());
  expect(event?.data.purchase).toEqual({
    transaction: record.transaction,
    order_date: record.orderedAt.getTime(),
  });
  expect(event?.data.product).toEqual({
    ucode: record.productUcode,
    id: record.productId,
    name: record.productName,
  });
});

test('legacy records and undated approvals cannot use receipt time as their purchase date', () => {
  expect(hotmartEventForReplay({ ...record, eventCreatedAt: null })).toBeNull();
  expect(hotmartEventForReplay({ ...record, eventVersion: null })).toBeNull();
  expect(hotmartEventForReplay({ ...record, orderedAt: null })).toBeNull();
  expect(
    hotmartEventForReplay({ ...record, orderedAt: null, event: 'PURCHASE_REFUNDED' })?.event,
  ).toBe('PURCHASE_REFUNDED');
});

test('product names are retained as bounded plain text while unrelated checkout data is discarded', () => {
  const original = hotmartEventForReplay(record)!;
  const parsed = parseHotmartEvent({
    ...original,
    credit_card: 'private',
    data: {
      ...original.data,
      product: { ...original.data.product, name: '  Course\nname\0 ', secret: 'private' },
      buyer: { ...original.data.buyer, document: 'private' },
    },
  });
  expect(parsed.success).toBe(true);
  if (!parsed.success) return;
  expect(parsed.data.data.product.name).toBe('Course name');
  expect(JSON.stringify(parsed.data)).not.toContain('private');
});

test('only unresolved integration results are reopened', () => {
  expect(isRetryableHotmartResult('Produto sem acesso configurado.')).toBe(true);
  expect(isRetryableHotmartResult('Compra com reembolso pendente; acesso não liberado.')).toBe(
    true,
  );
  expect(isRetryableHotmartResult('Compra aprovada; acesso liberado.')).toBe(false);
});
