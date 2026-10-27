import { and, asc, desc, eq, ilike, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { hotmartEvents } from '@/server/db/schema';
import { requireAdmin } from '@/features/admin/server/access';
import {
  HOTMART_RETRYABLE_RESULTS,
  hotmartEventForReplay,
  isRetryableHotmartResult,
} from '../recovery';
import { processHotmartEvent } from './process-event';

export const HOTMART_PENDING_PAGE_SIZE = 25;
export const pendingHotmartCondition = () =>
  inArray(hotmartEvents.result, [...HOTMART_RETRYABLE_RESULTS]);

// Explicit outer qualifiers survive Drizzle's column simplification in SELECT expressions.
const configuredProduct = sql<boolean>`(
  exists (select 1 from hotmart_product_mappings m
    where m.product_ucode = "hotmart_events"."product_ucode")
  or exists (select 1 from hotmart_product_ids n
    where n.product_id = "hotmart_events"."product_id")
)`;

/** Bounded recovery, using only authenticated provider data already stored by the webhook. */
export async function replayPendingHotmartEvents(productUcode?: string) {
  const events = await db
    .select()
    .from(hotmartEvents)
    .where(
      and(
        pendingHotmartCondition(),
        configuredProduct,
        productUcode ? eq(hotmartEvents.productUcode, productUcode) : undefined,
        isNotNull(hotmartEvents.eventCreatedAt),
        isNotNull(hotmartEvents.eventVersion),
        or(
          inArray(hotmartEvents.event, ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK']),
          isNotNull(hotmartEvents.orderedAt),
        ),
      ),
    )
    .orderBy(
      sql`case when ${hotmartEvents.event} in ('PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK') then 0 else 1 end`,
      asc(hotmartEvents.receivedAt),
      asc(hotmartEvents.id),
    )
    .limit(50);
  let recovered = 0;
  let failed = 0;
  for (const stored of events) {
    const event = hotmartEventForReplay(stored);
    if (!event) continue;
    try {
      if (!isRetryableHotmartResult(await processHotmartEvent(event))) recovered++;
    } catch {
      // Keep the durable pending record for the next attempt; do not expose buyer data in logs.
      failed++;
      console.error('[hotmart] Pending event recovery failed.');
    }
  }
  return { recovered, failed };
}

export async function getHotmartPendingState(query: string, page: number) {
  await requireAdmin('/admin/hotmart');
  const term = query.trim().slice(0, 120);
  const pattern = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
  const where = and(
    pendingHotmartCondition(),
    term
      ? or(
          ilike(hotmartEvents.buyerEmail, pattern),
          ilike(hotmartEvents.productName, pattern),
          ilike(hotmartEvents.productUcode, pattern),
          ilike(hotmartEvents.transaction, pattern),
          sql`${hotmartEvents.productId}::text ilike ${pattern}`,
        )
      : undefined,
  );
  const [events, [count], [all]] = await Promise.all([
    db
      .select({ event: hotmartEvents, configured: configuredProduct })
      .from(hotmartEvents)
      .where(where)
      .orderBy(desc(hotmartEvents.receivedAt), desc(hotmartEvents.id))
      .limit(HOTMART_PENDING_PAGE_SIZE)
      .offset((page - 1) * HOTMART_PENDING_PAGE_SIZE),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(hotmartEvents)
      .where(where),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(hotmartEvents)
      .where(pendingHotmartCondition()),
  ]);
  return { events, total: count?.total ?? 0, all: all?.total ?? 0 };
}
