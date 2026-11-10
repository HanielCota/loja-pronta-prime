import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { DeliverySelection } from '../../../features/loja-pronta/assisted-delivery';
import { user } from './auth';

export const assistedDeliveries = pgTable(
  'assisted_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    shopId: text('shop_id').notNull().unique(),
    brand: jsonb('brand')
      .$type<{ name: string; description: string; logoImage: string; fingerprint: string }>()
      .notNull(),
    selection: jsonb('selection').$type<DeliverySelection[]>().notNull(),
    itemIds: jsonb('item_ids')
      .$type<(string | null)[]>()
      .notNull()
      .default(sql`'[null,null,null,null,null]'::jsonb`),
    // Acesso de membro criado pela aluna na Plataforma de Subcontas da Shopee. A senha fica
    // cifrada (member-secret.ts) e é apagada quando a entrega termina.
    memberLogin: text('member_login'),
    memberPassword: text('member_password'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    operatorId: text('operator_id').references(() => user.id, { onDelete: 'set null' }),
    offerReviewId: uuid('offer_review_id'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('assisted_deliveries_queue_idx').on(table.completedAt, table.requestedAt),
    check('assisted_deliveries_shop_id_check', sql`${table.shopId} ~ '^[1-9][0-9]{0,15}$'`),
    check(
      'assisted_deliveries_selection_count_check',
      sql`jsonb_array_length(${table.selection}) = 5`,
    ),
    check('assisted_deliveries_item_count_check', sql`jsonb_array_length(${table.itemIds}) = 5`),
    check(
      'assisted_deliveries_completed_check',
      sql`${table.completedAt} is null or ${table.startedAt} is not null`,
    ),
  ],
);
