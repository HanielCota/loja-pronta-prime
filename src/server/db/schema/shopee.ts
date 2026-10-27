import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { SupplierProduct } from '../../../features/shopee/catalog';
import { user } from './auth';

/** Tokens sempre cifrados; uma loja não pode ser vinculada a duas alunas. */
export const shopeeConnections = pgTable(
  'shopee_connections',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    shopId: bigint('shop_id', { mode: 'number' }).notNull(),
    /** Registros antigos não podem ser usados por outro aplicativo ou ambiente. */
    applicationId: text('application_id').notNull().default('legacy'),
    accessTokenEncrypted: text('access_token_encrypted').notNull(),
    refreshTokenEncrypted: text('refresh_token_encrypted').notNull(),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('shopee_connections_shop_unique').on(table.shopId),
    check(
      'shopee_connections_shop_check',
      sql`${table.shopId} > 0 and ${table.shopId} <= 9007199254740991`,
    ),
  ],
);

/** Só o hash; o callback consome a intenção antes de trocar o código de uso único. */
export const shopeeAuthorizationStates = pgTable(
  'shopee_authorization_states',
  {
    stateHash: text('state_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    sessionId: text('session_id').notNull(),
    applicationId: text('application_id').notNull().default('legacy'),
    origin: text('origin', { enum: ['sll', 'loja-pronta', 'recovered'] })
      .notNull()
      .default('loja-pronta'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (table) => [
    index('shopee_authorization_states_expiry_idx').on(table.expiresAt),
    check('shopee_authorization_states_hash_check', sql`${table.stateHash} ~ '^[a-f0-9]{64}$'`),
    check(
      'shopee_authorization_states_origin_check',
      sql`${table.origin} in ('sll', 'loja-pronta', 'recovered')`,
    ),
  ],
);

/** Nenhum produto fictício é inserido. A importação depende do fornecedor confirmado. */
export const supplierCatalog = pgTable(
  'supplier_catalog',
  {
    supplierId: text('supplier_id').notNull(),
    sku: text('sku').notNull(),
    product: jsonb('product').$type<SupplierProduct>().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.supplierId, table.sku] })],
);
