import { expect, test } from 'bun:test';
import { trafficReportSchema } from './traffic-report';

const report = () => ({
  shopId: 1,
  applicationId: 'live:1',
  source: 'Relatório da loja',
  start: '2026-10-01T00:00:00Z',
  end: '2026-10-02T00:00:00Z',
  items: [{ itemId: 1, categoryId: 3, views: 100, impressions: 1000, clicks: 50, sales: 2 }],
});
test('conserva o período e a origem dos cliques reais', () => {
  expect(trafficReportSchema.parse(report()).items[0]?.clicks).toBe(50);
});
test('rejeita períodos invertidos, cliques incompatíveis e itens duplicados', () => {
  expect(trafficReportSchema.safeParse({ ...report(), end: '2026-09-01T00:00:00Z' }).success).toBe(
    false,
  );
  const invalid = report();
  invalid.items[0]!.clicks = 1001;
  expect(trafficReportSchema.safeParse(invalid).success).toBe(false);
  expect(
    trafficReportSchema.safeParse({ ...report(), items: [report().items[0], report().items[0]] })
      .success,
  ).toBe(false);
});
