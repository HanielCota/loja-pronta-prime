import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';
import type {
  LegacyCustomer,
  LegacyStore,
  LegacyProduct,
  LegacyPurchase,
} from '../../../features/legacy-stores/model';

export const legacyStoreImports = pgTable('legacy_store_imports', {
  id: text('id').primaryKey(),
  sourceProject: text('source_project').notNull(),
  exportedAt: timestamp('exported_at').notNull(),
  importedAt: timestamp('imported_at').defaultNow().notNull(),
  customerCount: integer('customer_count').notNull(),
  storeCount: integer('store_count').notNull(),
  productCount: integer('product_count').notNull(),
  purchaseCount: integer('purchase_count').notNull(),
});

export const legacyCustomers = pgTable(
  'legacy_customers',
  {
    id: uuid('id').primaryKey(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    record: jsonb('record').$type<LegacyCustomer>().notNull(),
  },
  (table) => [index('legacy_customers_user_idx').on(table.userId)],
);

export const legacyStores = pgTable(
  'legacy_stores',
  {
    id: uuid('id').primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => legacyCustomers.id),
    record: jsonb('record').$type<LegacyStore>().notNull(),
  },
  (table) => [index('legacy_stores_customer_idx').on(table.customerId)],
);

export const legacyStoreProducts = pgTable(
  'legacy_store_products',
  {
    id: uuid('id').primaryKey(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => legacyStores.id),
    record: jsonb('record').$type<LegacyProduct>().notNull(),
  },
  (table) => [index('legacy_store_products_store_idx').on(table.storeId)],
);

export const legacyPurchaseReferences = pgTable(
  'legacy_purchase_references',
  {
    transactionId: text('transaction_id').primaryKey(),
    customerId: uuid('customer_id').references(() => legacyCustomers.id),
    storeId: uuid('store_id').references(() => legacyStores.id),
    record: jsonb('record').$type<LegacyPurchase>().notNull(),
  },
  (table) => [index('legacy_purchase_references_customer_idx').on(table.customerId)],
);
