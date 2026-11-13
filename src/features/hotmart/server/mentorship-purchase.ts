import { sql, type SQLWrapper } from 'drizzle-orm';
import { env } from '@/config/env';
import { db } from '@/server/db';

export const mentorshipProductUcode = env.HOTMART_MENTORSHIP_PRODUCT_UCODE;

/** The configured product is independent of the course and store mappings. */
export function mentorshipPurchaseExists(userId: string | SQLWrapper) {
  if (!mentorshipProductUcode) {
    return sql<boolean>`false`;
  }

  return sql<boolean>`exists (
    select 1 from hotmart_purchases p
    where p.user_id = ${userId} and p.product_ucode = ${mentorshipProductUcode}
      and p.active and p.purchased_at <= now() and p.expires_at > now()
      and not exists (
        select 1 from hotmart_product_mappings m where m.product_ucode = p.product_ucode
      )
      and not exists (
        select 1 from hotmart_product_ids n
        where n.product_id = p.product_id or n.product_ucode = p.product_ucode
      )
  )`;
}

export async function hasMentorshipPurchase(userId: string) {
  if (!mentorshipProductUcode) {
    return false;
  }

  const {
    rows: [row],
  } = await db.execute<{ granted: boolean }>(
    sql`select ${mentorshipPurchaseExists(userId)} as granted`,
  );
  return row?.granted === true;
}
