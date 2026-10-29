import { bigint, boolean, index, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';
import type { ExpertId } from '../../../config/experts';

/** Configuração editada no painel; o token nunca sai do servidor em texto puro. */
export const hotmartSettings = pgTable('hotmart_settings', {
  id: text('id').primaryKey(),
  encryptedHottok: text('encrypted_hottok').notNull(),
  updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const hotmartProductMappings = pgTable(
  'hotmart_product_mappings',
  {
    productUcode: text('product_ucode').notNull(),
    access: text('access', { enum: ['sll', 'loja-pronta'] }).notNull(),
    expert: text('expert').$type<ExpertId>().notNull().default('pri'),
    primary: boolean('primary').notNull().default(true),
  },
  (table) => [primaryKey({ columns: [table.productUcode, table.access] })],
);

/** Numeric identities learn their immutable ucode only from authenticated webhooks. */
export const hotmartProductIds = pgTable('hotmart_product_ids', {
  productId: bigint('product_id', { mode: 'number' }).primaryKey(),
  productUcode: text('product_ucode').unique(),
  access: text('access', { enum: ['sll', 'loja-pronta'] }).notNull(),
  expert: text('expert').$type<ExpertId>().notNull(),
});

/** Uma compra pode liberar mais de uma área; cada transação mantém seu estado independente. */
export const hotmartPurchases = pgTable(
  'hotmart_purchases',
  {
    transaction: text('transaction').primaryKey(),
    buyerEmail: text('buyer_email').notNull(),
    productUcode: text('product_ucode').notNull(),
    productId: bigint('product_id', { mode: 'number' }),
    expert: text('expert').$type<ExpertId>().notNull().default('pri'),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    active: boolean('active').notNull(),
    purchasedAt: timestamp('purchased_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastEventAt: timestamp('last_event_at').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('hotmart_purchases_user_idx').on(table.userId)],
);

export const salesHistoryImports = pgTable('sales_history_imports', {
  sourceSha256: text('source_sha256').primaryKey(),
  preparedSha256: text('prepared_sha256').notNull(),
  importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Numeric report IDs remain numeric report IDs, never invented webhook ucodes. */
export const historicalSllPurchases = pgTable(
  'historical_sll_purchases',
  {
    transaction: text('transaction').primaryKey(),
    sourceSha256: text('source_sha256')
      .notNull()
      .references(() => salesHistoryImports.sourceSha256),
    sourceProductId: text('source_product_id').notNull(),
    buyerEmail: text('buyer_email').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    active: boolean('active').notNull().default(true),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [index('historical_sll_purchases_user_idx').on(table.userId)],
);

/** ID do evento é a chave de idempotência; não guardamos o payload completo com dados pessoais. */
export const hotmartEvents = pgTable(
  'hotmart_events',
  {
    id: text('id').primaryKey(),
    event: text('event').notNull(),
    transaction: text('transaction').notNull(),
    buyerEmail: text('buyer_email').notNull(),
    productUcode: text('product_ucode').notNull(),
    productId: bigint('product_id', { mode: 'number' }),
    productName: text('product_name'),
    buyerName: text('buyer_name'),
    eventVersion: text('event_version'),
    eventCreatedAt: timestamp('event_created_at', { withTimezone: true }),
    orderedAt: timestamp('ordered_at', { withTimezone: true }),
    result: text('result').notNull(),
    receivedAt: timestamp('received_at').defaultNow().notNull(),
  },
  (table) => [
    index('hotmart_events_received_idx').on(table.receivedAt),
    index('hotmart_events_result_idx').on(table.result),
    index('hotmart_events_transaction_idx').on(table.transaction),
  ],
);

/** Acessos manuais não podem ser removidos por um reembolso da Hotmart. */
export const manualProductGrants = pgTable(
  'manual_product_grants',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    product: text('product', { enum: ['sll', 'loja-pronta'] }).notNull(),
    // Null is reserved for legacy grants awaiting an evidence-based review.
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.product] })],
);

/** Administrative exclusions apply to one area of a purchase, never to the payment itself. */
export const hotmartPurchaseAccessRevocations = pgTable(
  'hotmart_purchase_access_revocations',
  {
    transaction: text('transaction')
      .notNull()
      .references(() => hotmartPurchases.transaction, { onDelete: 'cascade' }),
    product: text('product', { enum: ['sll', 'loja-pronta'] }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.transaction, table.product] })],
);
