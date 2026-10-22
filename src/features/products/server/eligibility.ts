import { sql } from 'drizzle-orm';
import { studentProducts } from '@/server/db/schema';

/** Check the underlying entitlement on every read; cached membership rows never extend a term. */
export function effectiveProductAccess() {
  return sql`(
    exists (select 1 from manual_product_grants m
      where m.user_id = ${studentProducts.userId} and m.product = ${studentProducts.product})
    or exists (select 1 from hotmart_purchases p
      join hotmart_product_mappings m on m.product_ucode = p.product_ucode
      where p.user_id = ${studentProducts.userId} and m.access = ${studentProducts.product}
        and p.active and p.purchased_at <= now() and p.expires_at > now()
        and not exists (select 1 from hotmart_purchase_access_revocations r
          where r.transaction = p.transaction and r.product = m.access))
    or (${studentProducts.product} = 'sll' and exists (
      select 1 from historical_sll_purchases h where h.user_id = ${studentProducts.userId}
        and h.active and h.revoked_at is null and h.purchased_at <= now() and h.expires_at > now()))
  )`;
}
