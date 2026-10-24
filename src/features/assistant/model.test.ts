import { describe, expect, test } from 'bun:test';
import {
  batchObservationState,
  clickThroughRate,
  compareCategories,
  counterDifference,
  DAY_MS,
  observationWindow,
  observationSeries,
  planNeedsHistory,
  playbookSchema,
  shopeeIdSchema,
  starterPlaybooks,
  validateInitialSelection,
  type MetricWindow,
} from './model';

describe('método de cinco produtos e plano de sete dias', () => {
  test('sete dias exatos usa histórico, sem confundir o relógio do lote', () => {
    expect(planNeedsHistory('under_7_days')).toBe(false);
    expect(planNeedsHistory('exactly_7_days')).toBe(true);
    const published = new Date('2026-10-17T13:00:00Z');
    expect(
      batchObservationState(published, new Date(published.getTime() + 5 * DAY_MS - 1)).status,
    ).toBe('observing');
    expect(
      batchObservationState(published, new Date(published.getTime() + 5 * DAY_MS)).status,
    ).toBe('ready');
    expect(batchObservationState(null).status).toBe('publishing');
  });
  test('o lote inicial tem exatamente cinco produtos distintos', () => {
    expect(validateInitialSelection(['a', 'b', 'c', 'd', 'e'])).toBe(true);
    expect(validateInitialSelection(['a', 'b', 'c', 'd', 'a'])).toBe(false);
    expect(validateInitialSelection(['a', 'b', 'c', 'd'])).toBe(false);
    expect(validateInitialSelection(['a', 'b', 'c', 'd', 'e', 'f'])).toBe(false);
  });
  test('os roteiros têm sete dias completos e não aceitam ações duplicadas', () => {
    const books = starterPlaybooks();
    expect(books).toHaveLength(3);
    for (const book of books) expect(playbookSchema.safeParse(book).success).toBe(true);
    const book = books[0]!;
    expect(playbookSchema.safeParse({ ...book, actions: book.actions.slice(1) }).success).toBe(
      false,
    );
    expect(
      playbookSchema.safeParse({
        ...book,
        actions: book.actions.map((action) => ({ ...action, id: 'mesma' })),
      }).success,
    ).toBe(false);
  });
});
describe('dados observados e comparação', () => {
  test('ausência, zero e reinício do contador são situações diferentes', () => {
    expect(counterDifference(null, 5)).toBeNull();
    expect(counterDifference(0, 0)).toBe(0);
    expect(counterDifference(8, 2)).toBeNull();
    expect(counterDifference(8, 11)).toBe(3);
  });
  test('CTR exige impressões, não visualizações de página', () => {
    expect(clickThroughRate({ views: 100, clicks: 10, impressions: null, sales: 1 })).toBeNull();
    expect(clickThroughRate({ views: 30, clicks: 10, impressions: 100, sales: 1 })).toBe(0.1);
    expect(clickThroughRate({ views: 30, clicks: 10, impressions: 5, sales: 1 })).toBeNull();
  });
  const left: MetricWindow = {
    itemId: 1,
    categoryId: 10,
    start: '2026-10-17T00:00:00Z',
    end: '2026-10-22T00:00:00Z',
    views: 110,
    impressions: null,
    clicks: null,
    sales: 0,
  };
  const right: MetricWindow = { ...left, itemId: 2, categoryId: 20, views: 200 };
  test('não aponta resultado entre períodos diferentes ou exposição insuficiente', () => {
    expect(compareCategories(left, { ...right, start: '2026-10-18T00:00:00Z' }).status).toBe(
      'incomparable',
    );
    expect(compareCategories({ ...left, views: 50 }, right).status).toBe('insufficient');
    expect(compareCategories(left, right)).toMatchObject({
      status: 'compared',
      preferredItemId: 2,
      leftCtr: null,
    });
  });
  test('mudança de categoria durante a janela invalida a comparação', () => {
    const item = {
      itemId: 1,
      categoryId: 10,
      title: 'Produto',
      collectedAt: left.start,
      views: 0,
      impressions: null,
      clicks: null,
      sales: 0,
    };
    expect(observationWindow(item, { ...item, categoryId: 20, collectedAt: left.end })).toBeNull();
  });
});

test('uma queda intermediária ou um sumiço não fica escondido pela coleta final', () => {
  const first = {
    itemId: 1,
    categoryId: 2,
    title: 'Produto',
    views: 100,
    sales: 3,
    clicks: null,
    impressions: null,
    collectedAt: '2026-10-17T00:00:00Z',
  };
  const middle = { ...first, views: 20, collectedAt: '2026-10-18T00:00:00Z' };
  const last = { ...first, views: 200, collectedAt: '2026-10-22T00:00:00Z' };
  expect(observationSeries([first, middle, last])?.views).toBeNull();
  expect(observationSeries([first, undefined, last])).toBeNull();
  expect(observationSeries([first, { ...middle, categoryId: 8 }, last])).toBeNull();
  expect(observationWindow(first, { ...last, collectedAt: 'data inválida' })).toBeNull();
});

describe('shopeeIdSchema', () => {
  test('accepts real Shopee ids up to the largest safe integer', () => {
    for (const id of [1, 25_000_000_000, 120_000_000_000, Number.MAX_SAFE_INTEGER])
      expect(shopeeIdSchema.safeParse(id).success).toBe(true);
  });

  test('rejects ids the JSON parser may have rounded, and non-ids', () => {
    for (const id of [Number.MAX_SAFE_INTEGER + 1, 2 ** 63, 0, -1, 1.5, Number.NaN, Infinity, '1'])
      expect(shopeeIdSchema.safeParse(id).success).toBe(false);
  });
});
