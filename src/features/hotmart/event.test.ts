import { describe, expect, test } from 'bun:test';
import {
  cleanBuyerName,
  parseHotmartEvent,
  purchaseEffect,
  shouldApplyEvent,
  transactionMismatch,
} from './event';

describe('avisos da Hotmart', () => {
  const validEvent = {
    id: 'evento-1',
    event: 'PURCHASE_APPROVED',
    creation_date: new Date('2026-10-06T12:00:00Z').getTime(),
    version: '2.0.0',
    data: {
      product: { ucode: 'curso-1' },
      buyer: { email: 'ana@exemplo.com', name: 'Ana' },
      purchase: { transaction: 'HP123' },
    },
  };

  test('preserves numeric product IDs and rejects unsafe or nonnumeric IDs', () => {
    const parsed = parseHotmartEvent({
      ...validEvent,
      data: { ...validEvent.data, product: { ucode: 'course', id: 8781486 } },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.data.product.id).toBe(8781486);
    for (const id of ['8781486', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect(
        parseHotmartEvent({
          ...validEvent,
          data: { ...validEvent.data, product: { ucode: 'course', id } },
        }).success,
      ).toBe(false);
  });

  test('a transaction cannot switch numeric products even when its ucode is unchanged', () => {
    const purchase = {
      buyerEmail: 'buyer@example.invalid',
      productUcode: 'course',
      productId: 8781486,
    };
    expect(transactionMismatch(purchase, { ...purchase, productId: 8781449 })).toBe('product');
    expect(transactionMismatch(purchase, { ...purchase, productId: undefined })).toBeNull();
  });

  test('accepts documented numeric-string purchase dates without using event arrival time', () => {
    const timestamp = 1791475200000;
    for (const order_date of [timestamp, String(timestamp)]) {
      const parsed = parseHotmartEvent({
        ...validEvent,
        data: { ...validEvent.data, purchase: { transaction: 'HP123', order_date } },
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.data.purchase.order_date).toBe(timestamp);
    }
    for (const order_date of ['', 'tomorrow', true, -1, Infinity])
      expect(
        parseHotmartEvent({
          ...validEvent,
          data: { ...validEvent.data, purchase: { transaction: 'HP123', order_date } },
        }).success,
      ).toBe(false);
  });

  test('aceita aviso válido e ignora campos extras do provedor', () => {
    const parsed = parseHotmartEvent({ ...validEvent, extra: 'não guardar' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toEqual(validEvent);
  });

  test('recusa datas não representáveis e campos excessivos antes de chegar ao banco', () => {
    for (const creation_date of [Infinity, NaN, 1.5, 0, 253_402_300_800_000])
      expect(parseHotmartEvent({ ...validEvent, creation_date }).success).toBe(false);
    expect(parseHotmartEvent({ ...validEvent, id: 'x'.repeat(201) }).success).toBe(false);
    expect(parseHotmartEvent({ ...validEvent, id: 'evento\0' }).success).toBe(false);
    expect(
      parseHotmartEvent({
        ...validEvent,
        data: { ...validEvent.data, buyer: { email: 'ana@exemplo.com', name: 'x'.repeat(2001) } },
      }).success,
    ).toBe(false);
  });

  test('nome com quebra de linha ou comprido demais é limpo, sem recusar a compra', () => {
    const parsed = parseHotmartEvent({
      ...validEvent,
      data: {
        ...validEvent.data,
        buyer: { email: 'ana@exemplo.com', name: '  Ana\n\tSilva\u0000 ' + 'x'.repeat(300) },
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const name = parsed.data.data.buyer.name ?? '';
      expect(name.startsWith('Ana Silva x')).toBe(true);
      expect(name.length).toBeLessThanOrEqual(200);
    }
    expect(cleanBuyerName('\u0007')).toBe('');
  });
  test('somente pagamento confirmado libera e reembolso retira', () => {
    expect(purchaseEffect('PURCHASE_APPROVED')).toBe('grant');
    expect(purchaseEffect('PURCHASE_REFUNDED')).toBe('revoke');
    expect(purchaseEffect('PURCHASE_CHARGEBACK')).toBe('revoke');
    expect(purchaseEffect('PURCHASE_BILLET_PRINTED')).toBe('ignore');
    expect(purchaseEffect('PURCHASE_CANCELED')).toBe('ignore');
  });

  test('rejeita evento incompleto', () => {
    expect(parseHotmartEvent({ event: 'PURCHASE_APPROVED' }).success).toBe(false);
  });

  test('não restaura uma compra com aviso anterior ao reembolso', () => {
    const refunded = { lastEventAt: new Date('2026-10-05T12:00:00Z'), active: false };
    expect(
      shouldApplyEvent(refunded, { createdAt: new Date('2026-10-05T11:00:00Z'), active: true }),
    ).toBe(false);
    expect(shouldApplyEvent(refunded, { createdAt: refunded.lastEventAt, active: true })).toBe(
      false,
    );
    expect(
      shouldApplyEvent(refunded, { createdAt: new Date('2026-10-06T12:00:00Z'), active: true }),
    ).toBe(false);
  });

  test('aponta quando a mesma transação chega com outro email ou produto', () => {
    const purchase = { buyerEmail: 'ana@exemplo.com', productUcode: 'curso' };
    expect(transactionMismatch(undefined, purchase)).toBeNull();
    expect(transactionMismatch(purchase, { ...purchase })).toBeNull();
    expect(transactionMismatch(purchase, { ...purchase, buyerEmail: 'ana@novo.com' })).toBe(
      'email',
    );
    expect(transactionMismatch(purchase, { ...purchase, productUcode: 'outro' })).toBe('product');
    expect(
      transactionMismatch(purchase, { buyerEmail: 'ana@novo.com', productUcode: 'outro' }),
    ).toBe('product');
  });
});
