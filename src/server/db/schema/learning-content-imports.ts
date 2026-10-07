import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Uma entrega de conteúdo só é aplicada uma vez; próximos deploys preservam as edições do admin. */
export const learningContentImports = pgTable('learning_content_imports', {
  key: text('key').primaryKey(),
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
});
