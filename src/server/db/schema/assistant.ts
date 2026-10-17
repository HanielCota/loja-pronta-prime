import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  bigint,
  boolean,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { learningContentBlocks } from './learning-content';
import type { ExpertId } from '../../../config/experts';
import type {
  PlanAction,
  PublicationPayload,
  Strategy,
  BatchAnalysis,
} from '../../../features/assistant/model';

export const studentExperiences = pgTable(
  'student_experiences',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    expert: text('expert').$type<ExpertId>().notNull().default('pri'),
    manualExpert: text('manual_expert').$type<ExpertId>(),
    manualAssignedBy: text('manual_assigned_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    manualAssignedAt: timestamp('manual_assigned_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'student_experiences_expert_check',
      sql`${table.expert} in ('pri','ze') and (${table.manualExpert} is null or ${table.manualExpert} in ('pri','ze'))`,
    ),
  ],
);

export const learningVideoVariants = pgTable(
  'learning_video_variants',
  {
    blockId: uuid('block_id')
      .notNull()
      .references(() => learningContentBlocks.id, { onDelete: 'cascade' }),
    expert: text('expert').$type<ExpertId>().notNull(),
    publishedVideoId: text('published_video_id'),
    draftVideoId: text('draft_video_id'),
    updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.blockId, table.expert] }),
    check('learning_video_variants_expert_check', sql`${table.expert} in ('pri','ze')`),
  ],
);

export const assistantPlaybooks = pgTable(
  'assistant_playbooks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    strategy: text('strategy').$type<Strategy>().notNull(),
    revision: integer('revision').notNull().default(1),
    actions: jsonb('actions').$type<PlanAction[]>().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'assistant_playbooks_strategy_check',
      sql`${table.strategy} in ('organic','hybrid','paid')`,
    ),
  ],
);

export const assistantPlans = pgTable(
  'assistant_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    playbookId: uuid('playbook_id')
      .notNull()
      .references(() => assistantPlaybooks.id),
    revision: integer('revision').notNull(),
    strategy: text('strategy').$type<Strategy>().notNull(),
    storeAge: text('store_age').notNull(),
    shopId: bigint('shop_id', { mode: 'number' }),
    applicationId: text('application_id'),
    actions: jsonb('actions').$type<PlanAction[]>().notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('assistant_plans_active_unique')
      .on(table.userId)
      .where(sql`${table.active}=true`),
    check('assistant_plans_strategy_check', sql`${table.strategy} in ('organic','hybrid','paid')`),
    check(
      'assistant_plans_age_check',
      sql`${table.storeAge} in ('under_7_days','exactly_7_days','over_7_days')`,
    ),
  ],
);

export const assistantPlanProgress = pgTable(
  'assistant_plan_progress',
  {
    planId: uuid('plan_id')
      .notNull()
      .references(() => assistantPlans.id, { onDelete: 'cascade' }),
    actionId: text('action_id').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.planId, table.actionId] })],
);

export const shopeeCollectionRuns = pgTable(
  'shopee_collection_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    shopId: bigint('shop_id', { mode: 'number' }).notNull(),
    applicationId: text('application_id').notNull(),
    status: text('status', { enum: ['running', 'completed', 'failed'] })
      .notNull()
      .default('running'),
    itemCount: integer('item_count').notNull().default(0),
    failure: text('failure'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [index('shopee_collection_runs_user_idx').on(table.userId, table.startedAt)],
);

export const shopeeMetricSnapshots = pgTable(
  'shopee_metric_snapshots',
  {
    runId: uuid('run_id')
      .notNull()
      .references(() => shopeeCollectionRuns.id, { onDelete: 'cascade' }),
    itemId: bigint('item_id', { mode: 'number' }).notNull(),
    title: text('title').notNull(),
    categoryId: bigint('category_id', { mode: 'number' }),
    views: bigint('views', { mode: 'number' }),
    impressions: bigint('impressions', { mode: 'number' }),
    clicks: bigint('clicks', { mode: 'number' }),
    sales: bigint('sales', { mode: 'number' }),
  },
  (table) => [primaryKey({ columns: [table.runId, table.itemId] })],
);

export const assistantCategoryExperiments = pgTable(
  'assistant_category_experiments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    shopId: bigint('shop_id', { mode: 'number' }).notNull(),
    applicationId: text('application_id').notNull(),
    leftItemId: bigint('left_item_id', { mode: 'number' }).notNull(),
    rightItemId: bigint('right_item_id', { mode: 'number' }).notNull(),
    baselineRunId: uuid('baseline_run_id')
      .notNull()
      .references(() => shopeeCollectionRuns.id),
    minViews: integer('min_views').notNull().default(100),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'assistant_experiments_items_check',
      sql`${table.leftItemId} <> ${table.rightItemId} and ${table.minViews}>0`,
    ),
  ],
);

export const supplierPublicationMappings = pgTable(
  'supplier_publication_mappings',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    supplierId: text('supplier_id').notNull(),
    sku: text('sku').notNull(),
    shopId: bigint('shop_id', { mode: 'number' }).notNull(),
    applicationId: text('application_id').notNull(),
    payload: jsonb('payload').$type<PublicationPayload>().notNull(),
    confirmedBy: text('confirmed_by')
      .notNull()
      .references(() => user.id),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.supplierId, table.sku, table.shopId, table.applicationId],
    }),
  ],
);

export const assistantPublicationBatches = pgTable(
  'assistant_publication_batches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    shopId: bigint('shop_id', { mode: 'number' }).notNull(),
    applicationId: text('application_id').notNull(),
    kind: text('kind', { enum: ['initial', 'expansion'] })
      .notNull()
      .default('initial'),
    strategy: text('strategy', { enum: ['varied', 'niche'] }).notNull(),
    status: text('status', { enum: ['publishing', 'observing', 'evaluated', 'blocked'] })
      .notNull()
      .default('publishing'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    evaluatedAt: timestamp('evaluated_at', { withTimezone: true }),
    analysis: jsonb('analysis').$type<BatchAnalysis>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('assistant_batches_user_idx').on(table.userId),
    uniqueIndex('assistant_batches_initial_unique')
      .on(table.userId, table.shopId, table.applicationId)
      .where(sql`${table.kind}='initial'`),
    check('assistant_batches_kind_check', sql`${table.kind} in ('initial','expansion')`),
    check('assistant_batches_strategy_check', sql`${table.strategy} in ('varied','niche')`),
  ],
);

export const assistantPublicationItems = pgTable(
  'assistant_publication_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => assistantPublicationBatches.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    shopId: bigint('shop_id', { mode: 'number' }).notNull(),
    applicationId: text('application_id').notNull(),
    supplierId: text('supplier_id').notNull(),
    sku: text('sku').notNull(),
    payload: jsonb('payload').$type<PublicationPayload>().notNull(),
    itemId: bigint('item_id', { mode: 'number' }),
    status: text('status', { enum: ['pending', 'sending', 'published', 'unknown', 'failed'] })
      .notNull()
      .default('pending'),
    authorizedAt: timestamp('authorized_at', { withTimezone: true }).defaultNow().notNull(),
    failure: text('failure'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('assistant_publication_product_unique').on(
      table.userId,
      table.shopId,
      table.applicationId,
      table.sku,
    ),
    uniqueIndex('assistant_publication_item_unique').on(
      table.userId,
      table.shopId,
      table.applicationId,
      table.itemId,
    ),
  ],
);

export const assistantJobs = pgTable(
  'assistant_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['collect', 'publish', 'evaluate'] }).notNull(),
    deduplicationKey: text('deduplication_key').notNull().unique(),
    payload: jsonb('payload').$type<{ itemId?: string; batchId?: string }>().notNull().default({}),
    status: text('status', { enum: ['pending', 'running', 'completed', 'blocked', 'unknown'] })
      .notNull()
      .default('pending'),
    runAt: timestamp('run_at', { withTimezone: true }).notNull().defaultNow(),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    failure: text('failure'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('assistant_jobs_due_idx').on(table.status, table.runAt)],
);

export const assistantAdvice = pgTable(
  'assistant_advice',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    runId: uuid('run_id')
      .notNull()
      .references(() => shopeeCollectionRuns.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['processing', 'ready', 'failed'] })
      .notNull()
      .default('processing'),
    model: text('model').notNull(),
    priorities: jsonb('priorities')
      .$type<{ action: string; itemId: number | null }[]>()
      .notNull()
      .default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('assistant_advice_run_unique').on(table.userId, table.runId)],
);
