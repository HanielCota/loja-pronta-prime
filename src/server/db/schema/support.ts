import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const supportContacts = pgTable('support_contacts', {
  topic: text('topic').primaryKey(),
  phone: text('phone').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
