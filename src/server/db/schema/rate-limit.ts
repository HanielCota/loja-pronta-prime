import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Contadores de tentativas do rate-limiter-flexible (RateLimiterDrizzle). */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  points: integer('points').notNull(),
  expire: timestamp('expire'),
});
