import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

/** Registra quem mudou cada acesso e por quê, sem misturar SLL e Loja Pronta. */
export const productAccessEvents = pgTable(
  'product_access_events',
  {
    id: text('id').primaryKey(),
    targetUserId: text('target_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Sem notNull: apagar a conta de uma administradora não pode falhar por causa do
    // histórico. O registro fica, só perde quem fez a mudança.
    actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
    product: text('product', { enum: ['sll', 'loja-pronta'] }).notNull(),
    action: text('action', { enum: ['granted', 'revoked'] }).notNull(),
    reason: text('reason').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('product_access_events_created_at_idx').on(table.createdAt),
    index('product_access_events_target_user_idx').on(table.targetUserId),
  ],
);
