import { expect, test } from 'bun:test';
import { purchaseExpiresAt } from './access-term';

test('a purchase expires at its local anniversary, clamping leap day', () => {
  expect(purchaseExpiresAt(new Date('2024-02-29T15:00:00Z')).toISOString()).toBe(
    '2025-02-28T15:00:00.000Z',
  );
  expect(purchaseExpiresAt(new Date('2025-01-01T02:59:59Z')).toISOString()).toBe(
    '2026-01-01T02:59:59.000Z',
  );
});
