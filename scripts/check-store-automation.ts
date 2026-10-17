import { and, isNull, sql } from 'drizzle-orm';
import { db } from '../src/server/db';
import {
  assistantPlaybooks,
  storeAutomationJobs,
  assistantPublicationItems,
} from '../src/server/db/schema';
import { getShopeeConfiguration } from '../src/features/shopee/server/client';
import { configuredSupplierSources } from '../src/features/shopee/supplier-feed';
import { hasHealthyAssistantWorker } from '../src/server/runtime-health';

// Somente presença e contagens; nunca imprime URLs, chaves ou dados de compradoras.
async function check() {
  try {
    const worker = await hasHealthyAssistantWorker();
    const config = getShopeeConfiguration();
    const sources = configuredSupplierSources();
    const books = await db
      .select({ strategy: assistantPlaybooks.strategy })
      .from(assistantPlaybooks)
      .where(
        and(
          isNull(assistantPlaybooks.archivedAt),
          sql`${assistantPlaybooks.publishedAt} is not null`,
        ),
      );
    const [changes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(storeAutomationJobs)
      .where(sql`${storeAutomationJobs.status} = 'unknown'`);
    const [publications] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assistantPublicationItems)
      .where(sql`${assistantPublicationItems.status} = 'unknown'`);
    console.log(
      JSON.stringify(
        {
          database: true,
          worker,
          shopeeConfigured: Boolean(config),
          shopeeEnabled: config?.SHOPEE_ENABLED === 'true',
          publicationEnabled: process.env.SHOPEE_PUBLICATION_ENABLED === 'true',
          supplierSources: sources.length,
          supplierCredentialsPresent: sources.every(
            (source) => !source.tokenEnv || Boolean(process.env[source.tokenEnv]),
          ),
          trafficReportConfigured: Boolean(process.env.SHOPEE_TRAFFIC_REPORT_URL),
          publishedStrategies: [...new Set(books.map((book) => book.strategy))],
          uncertainChanges: changes!.count,
          uncertainPublications: publications!.count,
        },
        null,
        2,
      ),
    );
    if (!worker) process.exitCode = 1;
  } catch {
    console.error('Não foi possível conferir a operação. Verifique banco e configuração.');
    process.exitCode = 1;
  } finally {
    await db.$client.end();
  }
}
void check();
