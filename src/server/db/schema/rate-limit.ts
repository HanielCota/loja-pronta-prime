import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Contadores de tentativas por minuto (src/server/auth/rate-limit.ts). Chave = escopo + hash. */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  points: integer('points').notNull(),
  expire: timestamp('expire'),
});
