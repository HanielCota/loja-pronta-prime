import { expect, test } from 'bun:test';
import { parseManualAccessTerm } from './manual-access-term';

const now = new Date('2026-10-29T15:00:00Z');
function term(mode: string, date: string, suffix = '') {
  const data = new FormData();
  data.set(`termMode${suffix}`, mode);
  data.set(`termDate${suffix}`, date);
  return parseManualAccessTerm(data, suffix, now);
}

test('regularizing an older purchase keeps its original anniversary', () => {
  expect(term('purchase', '2026-01-15')).toEqual({
    ok: true,
    expiresAt: new Date('2027-01-16T02:59:59.999Z'),
  });
});

test('date-only deadlines include their final Brasília day and remain independent by product', () => {
  expect(term('until', '2026-10-29', '-sll')).toEqual({
    ok: true,
    expiresAt: new Date('2026-10-30T02:59:59.999Z'),
  });
  expect(term('until', '2026-10-28').ok).toBe(false);
});

test('missing, malformed, overflowing and elapsed terms cannot create an unlimited grant', () => {
  for (const date of ['', 'invalid', '2026-02-30', '2026-13-01', '2025-01-15'])
    expect(term('purchase', date).ok).toBe(false);
  expect(term('no-end', '2027-01-15').ok).toBe(false);
  expect(term('purchase', '2026-10-30').ok).toBe(false);
  expect(term('purchase', '2026-10-29').ok).toBe(true);
});

test('leap-day purchases end on the February anniversary', () => {
  const data = new FormData();
  data.set('termMode', 'purchase');
  data.set('termDate', '2024-02-29');
  expect(parseManualAccessTerm(data, '', new Date('2024-10-29T15:00:00Z'))).toEqual({
    ok: true,
    expiresAt: new Date('2025-03-01T02:59:59.999Z'),
  });
});

test('reviewing an old grant can record an already expired anniversary without renewing it', () => {
  const data = new FormData();
  data.set('termMode', 'purchase');
  data.set('termDate', '2025-01-15');
  expect(parseManualAccessTerm(data, '', now, { allowExpired: true })).toEqual({
    ok: true,
    expiresAt: new Date('2026-01-16T02:59:59.999Z'),
  });
});
