import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { learningPublishState } from './learning-content';

/** Slides do painel do SLL. Sem imagem, o slide continua em rascunho e não aparece à aluna. */
export const learningBanners = pgTable(
  'learning_banners',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(),
    label: text('label'),
    title: text('title').notNull(),
    description: text('description').notNull(),
    buttonLabel: text('button_label').notNull(),
    destination: text('destination').notNull(),
    imageStorageKey: text('image_storage_key'),
    imageAlt: text('image_alt'),
    position: integer('position').default(0).notNull(),
    status: learningPublishState('status').default('draft').notNull(),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('learning_banners_order_idx').on(table.position, table.id),
    check('learning_banners_position_check', sql`${table.position} >= 0`),
  ],
);
