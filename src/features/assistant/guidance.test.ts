import { expect, test } from 'bun:test';
import { guidanceCandidates, validAdvice } from './guidance';
import type { MetricObservation, MetricWindow } from './model';

const item: MetricObservation = {
  itemId: 1,
  categoryId: 3,
  title: 'Produto',
  views: 50,
  sales: 0,
  clicks: null,
  impressions: null,
  collectedAt: '2026-10-17T00:00:00Z',
};
const window: MetricWindow = { ...item, start: '2026-10-16T00:00:00Z', end: item.collectedAt };
test('orientação exige diferenças válidas e não transforma dados ausentes em zero', () => {
  expect(guidanceCandidates([item], [])).toEqual([{ action: 'collect-period', itemId: null }]);
  expect(guidanceCandidates([item], [{ ...window, views: null }])).toEqual([
    { action: 'keep-observing', itemId: null },
  ]);
  expect(guidanceCandidates([item], [{ ...window, sales: null }])).toEqual([
    { action: 'keep-observing', itemId: null },
  ]);
  expect(guidanceCandidates([item], [window])[0]).toEqual({ action: 'review-offer', itemId: 1 });
});
test('saída da IA fica restrita a ações e anúncios elegíveis, sem duplicação', () => {
  const candidates = guidanceCandidates([item], [window]);
  expect(validAdvice([{ action: 'review-offer', itemId: 1 }], candidates)).toBe(true);
  expect(validAdvice([{ action: 'review-offer', itemId: 2 }], candidates)).toBe(false);
  expect(validAdvice([{ action: 'review-exposure', itemId: 1 }], candidates)).toBe(false);
  expect(validAdvice([candidates[0]!, candidates[0]!], candidates)).toBe(false);
});
