import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  BaseProduct,
  ProductRecovery,
  RestoredProduct,
} from '../../../features/legacy-stores/recovery';
import type {
  PublicationContext,
  RecoveredListingPayload,
  RecoveredPublicationIntent,
  RecoveredPublicationStatus,
} from '../../../features/legacy-stores/publication';
import { user } from './auth';
import { legacyStoreProducts, legacyStores } from './legacy-stores';

export const legacyCatalogRecoveryRuns = pgTable('legacy_catalog_recovery_runs', {
  id: text('id').primaryKey(),
  manifestKey: text('manifest_key').notNull(),
  manifestSha256: text('manifest_sha256').notNull(),
  sourceProductCount: integer('source_product_count').notNull(),
  counts: jsonb('counts').$type<Record<ProductRecovery['status'], number>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
});

export const legacyCatalogProducts = pgTable(
  'legacy_catalog_products',
  {
    runId: text('run_id')
      .notNull()
      .references(() => legacyCatalogRecoveryRuns.id),
    id: text('id').notNull(),
    product: jsonb('product').$type<BaseProduct>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.runId, table.id] })],
);

export const legacyProductRecoveries = pgTable(
  'legacy_product_recoveries',
  {
    runId: text('run_id')
      .notNull()
      .references(() => legacyCatalogRecoveryRuns.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => legacyStoreProducts.id),
    storeId: uuid('store_id')
      .notNull()
      .references(() => legacyStores.id),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    baseProductId: text('base_product_id'),
    sourceHash: text('source_hash').notNull(),
    status: text('status', { enum: ['recovered', 'review', 'unmatched', 'protected'] }).notNull(),
    method: text('method', { enum: ['shop_item_id', 'title_description'] }),
    reasons: jsonb('reasons').$type<string[]>().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.runId, table.productId] }),
    index('legacy_product_recoveries_store_idx').on(table.storeId, table.runId),
    index('legacy_product_recoveries_user_idx').on(table.userId, table.runId),
    foreignKey({
      columns: [table.runId, table.baseProductId],
      foreignColumns: [legacyCatalogProducts.runId, legacyCatalogProducts.id],
    }),
    check(
      'legacy_product_recoveries_status_check',
      sql`${table.status} in ('recovered','review','unmatched','protected')`,
    ),
    check(
      'legacy_product_recoveries_method_check',
      sql`${table.method} is null or ${table.method} in ('shop_item_id','title_description')`,
    ),
    check(
      'legacy_product_recoveries_recovered_check',
      sql`${table.status} <> 'recovered' or (${table.baseProductId} is not null and ${table.userId} is not null and ${table.method} is not null)`,
    ),
  ],
);

export const legacyCatalogImports = pgTable(
  'legacy_catalog_imports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    runId: text('run_id').notNull(),
    productId: uuid('product_id')
      .notNull()
      .references(() => legacyStoreProducts.id),
    storeId: uuid('store_id')
      .notNull()
      .references(() => legacyStores.id),
    sourceHash: text('source_hash').notNull(),
    product: jsonb('product').$type<RestoredProduct>().notNull(),
    revision: integer('revision').notNull().default(1),
    importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('legacy_catalog_imports_owner_product_unique').on(table.userId, table.productId),
    index('legacy_catalog_imports_owner_idx').on(table.userId, table.importedAt),
    foreignKey({
      columns: [table.runId, table.productId],
      foreignColumns: [legacyProductRecoveries.runId, legacyProductRecoveries.productId],
    }),
    check(
      'legacy_catalog_imports_draft_check',
      sql`${table.product}->>'legacyProductId'=${table.productId}::text and ${table.product}->>'publicationReady'='false' and ${table.revision}>0`,
    ),
  ],
);

export const legacyCatalogPublications = pgTable(
  'legacy_catalog_publications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    importId: uuid('import_id')
      .notNull()
      .references(() => legacyCatalogImports.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    applicationId: text('application_id').notNull(),
    shopId: bigint('shop_id', { mode: 'number' }).notNull(),
    status: text('status').$type<RecoveredPublicationStatus>().notNull().default('editing'),
    context: jsonb('context').$type<PublicationContext>().notNull(),
    intent: jsonb('intent').$type<RecoveredPublicationIntent>(),
    fingerprint: text('fingerprint'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    payload: jsonb('payload').$type<RecoveredListingPayload>(),
    itemId: bigint('item_id', { mode: 'number' }),
    failure: text('failure'),
    leaseId: uuid('lease_id'),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('legacy_catalog_publications_import_unique').on(table.importId),
    index('legacy_catalog_publications_owner_idx').on(table.userId),
    index('legacy_catalog_publications_queue_idx').on(table.status, table.createdAt),
    check(
      'legacy_catalog_publications_status_check',
      sql`${table.status} in ('editing','review','pending','preparing','sending','published','blocked','unknown')`,
    ),
    check(
      'legacy_catalog_publications_confirmation_check',
      sql`${table.status} in ('editing','review','blocked') or (${table.confirmedAt} is not null and ${table.intent} is not null and ${table.fingerprint} is not null and ${table.expiresAt} is not null)`,
    ),
    check(
      'legacy_catalog_publications_published_check',
      sql`${table.status}<>'published' or ${table.itemId} is not null`,
    ),
    check(
      'legacy_catalog_publications_shop_check',
      sql`${table.shopId}>0 and ${table.shopId}<=9007199254740991`,
    ),
  ],
);
