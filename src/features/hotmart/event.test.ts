import { describe, expect, test } from 'bun:test';
import { parseHotmartEvent, purchaseEffect, shouldApplyEvent } from './event';

describe('avisos da Hotmart', () => {
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
});
