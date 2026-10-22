import { describe, expect, test } from 'bun:test';
import { parseSalesDate, prepareSalesHistory, salesAccessExpiresAt } from './sales-history';

const row = {
  sourceRow: 2,
  productName: 'MSL 2.0',
  productId: '3454404',
  transaction: 'HP12345',
  soldAt: '22/10/2025 15:00:00',
  confirmedAt: '22/10/2025 15:01:00',
  status: 'Completo',
  name: ' Ana\nSilva ',
  email: ' ANA@example.com ',
};
const asOf = new Date('2026-10-22T18:00:00Z');

describe('historical sales preparation', () => {
  test('expires at the original purchase anniversary, even with later confirmation', () => {
    const prepared = prepareSalesHistory([row], asOf, '-03:00');
    expect(prepared.purchases[0]).toMatchObject({
      email: 'ana@example.com',
      name: 'Ana Silva',
      product: 'sll',
      purchasedAt: '2025-10-22T18:00:00.000Z',
      confirmedAt: '2025-10-22T18:01:00.000Z',
      expiresAt: '2026-10-22T18:00:00.000Z',
      eligibility: 'expired',
    });
    expect(
      prepareSalesHistory([row], new Date(asOf.getTime() - 1), '-03:00').summary.eligibleEmails,
    ).toBe(1);
  });

  test('groups normalized emails without losing distinct purchases or renewing expired sales', () => {
    const result = prepareSalesHistory(
      [
        { ...row, soldAt: '01/05/2025 12:00:00', confirmedAt: '01/05/2025 12:01:00' },
        {
          ...row,
          sourceRow: 3,
          transaction: 'HP23456',
          soldAt: '23/10/2025 12:00:00',
          confirmedAt: '23/10/2025 12:01:00',
          email: 'ana@example.com',
        },
      ],
      asOf,
      '-03:00',
    );
    expect(result.summary).toMatchObject({
      preparedPurchases: 2,
      preparedEmails: 1,
      eligibleEmails: 1,
      expiredPurchases: 1,
      storeGrants: 0,
    });
  });

  test('quarantines every occurrence of a duplicate transaction, including conflicting owners', () => {
    const result = prepareSalesHistory(
      [row, { ...row, sourceRow: 3, email: 'other@example.com' }],
      asOf,
      '-03:00',
    );
    expect(result.purchases).toHaveLength(0);
    expect(result.review).toEqual([
      { sourceRow: 2, reasons: ['duplicate-transaction'] },
      { sourceRow: 3, reasons: ['duplicate-transaction'] },
    ]);
  });

  test('preserves installment suffixes as distinct immutable transaction identifiers', () => {
    const result = prepareSalesHistory(
      [row, { ...row, sourceRow: 3, transaction: 'HP12345C1' }],
      asOf,
      '-03:00',
    );
    expect(result.purchases.map((purchase) => purchase.transaction)).toEqual([
      'HP12345',
      'HP12345C1',
    ]);
    expect(result.review).toHaveLength(0);
  });

  test('does not guess emails, accept other products, or grant unpaid/refunded purchases', () => {
    for (const change of [
      { email: 'invalid' },
      { productId: '999' },
      { productName: 'Loja Pronta' },
      { status: 'Reembolsado' },
      { status: 'Cancelado' },
      { name: '\n\t' },
      { confirmedAt: '21/10/2025 12:00:00' },
      { soldAt: '31/02/2025 12:00:00' },
      { soldAt: '22/10/2027 12:00:00', confirmedAt: '22/10/2027 12:01:00' },
    ]) {
      const result = prepareSalesHistory([{ ...row, ...change }], asOf, '-03:00');
      expect(result.purchases).toHaveLength(0);
      expect(result.review).toHaveLength(1);
    }
  });

  test('handles leap day, year boundaries and malformed dates without rollover', () => {
    expect(parseSalesDate('31/12/2025 23:59:59', '-03:00')?.toISOString()).toBe(
      '2026-01-01T02:59:59.000Z',
    );
    expect(salesAccessExpiresAt(new Date('2024-02-29T15:00:00Z'), '-03:00').toISOString()).toBe(
      '2025-02-28T15:00:00.000Z',
    );
    for (const date of ['31/02/2025 12:00:00', '22/10/2025 24:00:00', '22/13/2025 12:00:00'])
      expect(parseSalesDate(date, '-03:00')).toBeNull();
    for (const offset of ['-14:30', '-25:00', 'UTC', '-03:99'])
      expect(parseSalesDate(row.soldAt, offset)).toBeNull();
    expect(() => prepareSalesHistory([row], new Date('invalid'), '-03:00')).toThrow();
  });
});
