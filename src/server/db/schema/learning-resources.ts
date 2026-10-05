import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { learningPublishState } from './learning-content';

/** Links e ferramentas confirmados para a página Recursos do SLL. */
export const learningResources = pgTable(
  'learning_resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(),
    groupKey: text('group_key').notNull(),
    groupTitle: text('group_title').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    buttonLabel: text('button_label'),
    destination: text('destination'),
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
    index('learning_resources_order_idx').on(table.groupKey, table.position, table.id),
    check('learning_resources_position_check', sql`${table.position} >= 0`),
  ],
);
