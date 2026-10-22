import { expect, test } from 'bun:test';
import { publicationObservationStart } from './publication-observation';
import type { MetricObservation } from './model';
const sample = (day: number): MetricObservation[] =>
  [1, 2, 3, 4, 5].map((itemId) => ({
    itemId,
    categoryId: itemId,
    title: 'Item',
    collectedAt: new Date(Date.UTC(2026, 0, day + 1)).toISOString(),
    views: day * 10,
    sales: null,
    impressions: null,
    clicks: null,
  }));
test('a clean shared period keeps its original baseline, including zero views', () => {
  expect(publicationObservationStart([sample(0), sample(2), sample(6)])).toBe(0);
});
test('missing items and missing views restart all five items at a shared baseline', () => {
  expect(
    publicationObservationStart([
      sample(0),
      [undefined, ...sample(1).slice(1)],
      sample(2),
      sample(8),
    ]),
  ).toBe(2);
  const missing = sample(1);
  missing[0]!.views = null;
  expect(publicationObservationStart([sample(0), missing, sample(2), sample(8)])).toBe(2);
  expect(publicationObservationStart([sample(0), missing])).toBe(2);
});
test('category changes and counter resets cannot be bridged by later data', () => {
  const changed = sample(1);
  changed[2]!.categoryId = 99;
  expect(publicationObservationStart([sample(0), changed, sample(2), sample(8)])).toBe(2);
  const reset = sample(2);
  reset[2]!.views = 1;
  expect(publicationObservationStart([sample(0), sample(1), reset, sample(8)])).toBe(2);
});
test('the newest invalid sample determines the start of the recovery window', () => {
  const changed = sample(4);
  changed[0]!.categoryId = 99;
  expect(
    publicationObservationStart([
      sample(0),
      [undefined],
      sample(2),
      changed,
      sample(5),
      sample(11),
    ]),
  ).toBe(4);
  expect(publicationObservationStart([])).toBe(0);
});
