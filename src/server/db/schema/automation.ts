import { index, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const runtimeHeartbeats = pgTable('runtime_heartbeats', {
  id: text('id').primaryKey(),
  service: text('service').notNull(),
  seenAt: timestamp('seen_at', { withTimezone: true }).defaultNow().notNull(),
});

/** A conexão não autoriza publicar: apenas permite preparar o catálogo disponível. */
export const supplierFeedSubscriptions = pgTable(
  'supplier_feed_subscriptions',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    supplierId: text('supplier_id').notNull(),
    cursor: text('cursor'),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    failure: text('failure'),
  },
  (table) => [primaryKey({ columns: [table.userId, table.supplierId] })],
);

/** Cada escrita conserva a autorização e seu resultado; timeout nunca provoca reenvio. */
export const storeAutomationJobs = pgTable(
  'store_automation_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    shopId: text('shop_id').notNull(),
    applicationId: text('application_id').notNull(),
    kind: text('kind', { enum: ['brand', 'edit', 'clone'] }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    sourceFingerprint: text('source_fingerprint'),
    baseline: jsonb('baseline').$type<Record<string, unknown>>(),
    result: jsonb('result').$type<{ itemId: number }>(),
    status: text('status', { enum: ['pending', 'running', 'completed', 'blocked', 'unknown'] })
      .default('pending')
      .notNull(),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    failure: text('failure'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [index('store_automation_jobs_due_idx').on(table.status, table.createdAt)],
);
