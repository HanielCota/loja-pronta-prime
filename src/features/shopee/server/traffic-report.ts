import { trafficReportSchema, type TrafficReport } from '../traffic-report';
import { downloadPublicFile } from './remote-file';

/** Relatórios têm período próprio; nunca são tratados como contadores acumulados. */
export async function collectTrafficReport(
  shopId: number,
  applicationId: string,
): Promise<TrafficReport | null> {
  if (!process.env.SHOPEE_TRAFFIC_REPORT_URL) return null;
  const url = new URL(process.env.SHOPEE_TRAFFIC_REPORT_URL);
  url.searchParams.set('shopId', String(shopId));
  const downloaded = await downloadPublicFile(
    url.toString(),
    [url.hostname],
    5_000_000,
    process.env.SHOPEE_TRAFFIC_REPORT_TOKEN,
  );
  const report = trafficReportSchema.parse(JSON.parse(downloaded.bytes.toString('utf8')));
  if (
    report.shopId !== shopId ||
    report.applicationId !== applicationId ||
    Date.parse(report.end) > Date.now() ||
    Date.parse(report.end) < Date.now() - 7 * 24 * 60 * 60_000
  )
    throw new Error('Relatório incompatível ou desatualizado.');
  return report;
}
