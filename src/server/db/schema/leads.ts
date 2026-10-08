import { date, index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const leads = pgTable(
  'leads',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    stage: text('stage', { enum: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] })
      .default('new')
      .notNull(),
    product: text('product', { enum: ['undecided', 'loja-pronta', 'sll', 'both'] })
      .default('undecided')
      .notNull(),
    source: text('source').notNull(),
    ownerId: text('owner_id').references(() => user.id, { onDelete: 'set null' }),
    nextContact: date('next_contact'),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    lostReason: text('lost_reason'),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('leads_email_unique').on(table.email),
    uniqueIndex('leads_phone_unique').on(table.phone),
    index('leads_stage_idx').on(table.stage),
    index('leads_next_contact_idx').on(table.nextContact),
    index('leads_owner_idx').on(table.ownerId),
    index('leads_updated_idx').on(table.updatedAt),
  ],
);

/** Histórico e contato ficam na mesma transação, para nunca perder uma alteração. */
export const leadActivities = pgTable(
  'lead_activities',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    kind: text('kind', { enum: ['created', 'updated', 'note', 'archived', 'restored'] }).notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('lead_activities_lead_idx').on(table.leadId, table.createdAt)],
);
