import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

/** Piloto da própria empresa; não compartilha credenciais com as alunas. */
export const blingConnections = pgTable(
  'bling_connections',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    clientId: text('client_id').notNull(),
    companyId: text('company_id').notNull(),
    companyCnpj: text('company_cnpj').notNull(),
    companyName: text('company_name').notNull(),
    accessTokenEncrypted: text('access_token_encrypted').notNull(),
    refreshTokenEncrypted: text('refresh_token_encrypted').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check('bling_connections_pilot_check', sql`${table.id} = 'main'`),
    check('bling_connections_cnpj_check', sql`${table.companyCnpj} ~ '^[0-9]{14}$'`),
  ],
);

export const blingAuthorizationStates = pgTable(
  'bling_authorization_states',
  {
    stateHash: text('state_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    sessionId: text('session_id').notNull(),
    clientId: text('client_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (table) => [
    check('bling_authorization_states_hash_check', sql`${table.stateHash} ~ '^[a-f0-9]{64}$'`),
  ],
);
