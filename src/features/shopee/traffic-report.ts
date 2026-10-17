import { z } from 'zod';

const count = z.number().int().nonnegative().safe();
export const trafficReportSchema = z
  .object({
    shopId: z.number().int().positive().safe(),
    applicationId: z.string().min(1).max(100),
    source: z.string().trim().min(1).max(200),
    start: z.iso.datetime({ offset: true }),
    end: z.iso.datetime({ offset: true }),
    items: z
      .array(
        z.object({
          itemId: z.number().int().positive().safe(),
          categoryId: z.number().int().positive().safe(),
          views: count,
          impressions: count,
          clicks: count,
          sales: count.nullable(),
        }),
      )
      .max(10_000),
  })
  .superRefine((report, context) => {
    if (Date.parse(report.start) >= Date.parse(report.end))
      context.addIssue({ code: 'custom', message: 'Período inválido.' });
    if (new Set(report.items.map((row) => row.itemId)).size !== report.items.length)
      context.addIssue({ code: 'custom', message: 'Anúncio repetido.' });
    if (report.items.some((row) => row.clicks > row.impressions))
      context.addIssue({ code: 'custom', message: 'Cliques incompatíveis com impressões.' });
  });
export type TrafficReport = z.infer<typeof trafficReportSchema>;
