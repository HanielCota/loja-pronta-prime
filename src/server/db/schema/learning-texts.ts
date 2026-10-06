import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Textos curtos das páginas do SLL que o painel permite adaptar sem alterar a estrutura. */
export const learningTexts = pgTable('learning_texts', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/** Textos em revisão ficam separados do que a aluna lê. */
export const learningTextDrafts = pgTable('learning_text_drafts', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/** Última versão visível antes da publicação mais recente. */
export const learningTextHistory = pgTable('learning_text_history', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
