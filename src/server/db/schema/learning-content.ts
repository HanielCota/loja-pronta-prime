import { relations, sql } from 'drizzle-orm';
import {
  check,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

/** Resposta da pergunta de entrada da Etapa 2; o limite exato ainda depende de decisão de produto. */
export const sllPlanStoreAge = pgEnum('sll_plan_store_age', [
  'under_7_days',
  'exactly_7_days',
  'over_7_days',
]);

/** Tipos de trilha necessários para o SLL: boas-vindas, método e cursos extras. */
export const learningTrackKind = pgEnum('learning_track_kind', [
  'welcome',
  'method',
  'complementary_course',
]);

/** Cada nível pode ficar em rascunho ou ser publicado. */
export const learningPublishState = pgEnum('learning_publish_state', ['draft', 'published']);

/** Blocos que podem ser colocados em uma aula; os detalhes ficam no JSON validado pelo servidor. */
export const learningContentBlockKind = pgEnum('learning_content_block_kind', [
  'text',
  'video',
  'link',
  'file',
  'image',
]);

export type LearningContentBlockData =
  | { text: string }
  | { provider: 'pandavideo'; videoId: string; note?: string }
  | { url: string; provider?: string }
  | { url: string; label: string; note?: string }
  | { storageKey: string; fileName: string; contentType: string; size: number; attachedTo?: string }
  | { storageKey: string; alt: string; contentType?: string; size?: number };

/** Raiz de conteúdo: a trilha de boas-vindas, o método ou um curso complementar. */
export const learningTracks = pgTable(
  'learning_tracks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: learningTrackKind('kind').notNull(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    coverStorageKey: text('cover_storage_key'),
    coverAlt: text('cover_alt'),
    featured: boolean('featured').default(false).notNull(),
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
    uniqueIndex('learning_tracks_slug_uidx').on(table.slug),
    index('learning_tracks_order_idx').on(table.position, table.id),
    check('learning_tracks_slug_check', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('learning_tracks_position_check', sql`${table.position} >= 0`),
  ],
);

/** Uma etapa pertence a uma trilha; a ordenação é explícita e não depende do título. */
export const learningStages = pgTable(
  'learning_stages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    trackId: uuid('track_id')
      .notNull()
      .references(() => learningTracks.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description'),
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
    uniqueIndex('learning_stages_track_slug_uidx').on(table.trackId, table.slug),
    index('learning_stages_order_idx').on(table.trackId, table.position, table.id),
    check('learning_stages_slug_check', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('learning_stages_position_check', sql`${table.position} >= 0`),
  ],
);

/** Módulos agrupam aulas dentro de uma etapa. */
export const learningModules = pgTable(
  'learning_modules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stageId: uuid('stage_id')
      .notNull()
      .references(() => learningStages.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description'),
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
    uniqueIndex('learning_modules_stage_slug_uidx').on(table.stageId, table.slug),
    index('learning_modules_order_idx').on(table.stageId, table.position, table.id),
    check('learning_modules_slug_check', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('learning_modules_position_check', sql`${table.position} >= 0`),
  ],
);

/** Aulas guardam os dados de apresentação; os materiais ficam em blocos ordenados. */
export const learningLessons = pgTable(
  'learning_lessons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => learningModules.id, { onDelete: 'cascade' }),
    relatedLessonId: uuid('related_lesson_id').references((): AnyPgColumn => learningLessons.id, {
      onDelete: 'set null',
    }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    /** Número que aparecia na área antiga; não substitui o UUID nem a ordem da lista. */
    sourceNumber: smallint('source_number'),
    durationMinutes: smallint('duration_minutes'),
    countsTowardProgress: boolean('counts_toward_progress').default(true).notNull(),
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
    uniqueIndex('learning_lessons_module_slug_uidx').on(table.moduleId, table.slug),
    index('learning_lessons_order_idx').on(table.moduleId, table.position, table.id),
    check('learning_lessons_slug_check', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('learning_lessons_position_check', sql`${table.position} >= 0`),
    check(
      'learning_lessons_source_number_check',
      sql`${table.sourceNumber} is null or ${table.sourceNumber} > 0`,
    ),
    check(
      'learning_lessons_duration_check',
      sql`${table.durationMinutes} is null or ${table.durationMinutes} > 0`,
    ),
  ],
);

/** Blocos seguem a publicação da aula, evitando estados de publicação conflitantes. */
export const learningContentBlocks = pgTable(
  'learning_content_blocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => learningLessons.id, { onDelete: 'cascade' }),
    kind: learningContentBlockKind('kind').notNull(),
    data: jsonb('data').$type<LearningContentBlockData>().notNull(),
    position: integer('position').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('learning_content_blocks_order_idx').on(table.lessonId, table.position, table.id),
    check('learning_content_blocks_data_check', sql`jsonb_typeof(${table.data}) = 'object'`),
    check('learning_content_blocks_position_check', sql`${table.position} >= 0`),
  ],
);

export type LearningDraftBlock = {
  id: string;
  kind: 'text' | 'video' | 'link' | 'file' | 'image';
  data: LearningContentBlockData;
  position: number;
};

export type LearningNodeDraftData = {
  title?: string;
  description?: string | null;
  durationMinutes?: number | null;
  countsTowardProgress?: boolean;
  relatedLessonId?: string | null;
  blocks?: LearningDraftBlock[];
  groupTitle?: string;
  buttonLabel?: string | null;
  destination?: string | null;
  label?: string | null;
  imageAlt?: string | null;
  imageStorageKey?: string | null;
  coverStorageKey?: string | null;
  coverAlt?: string | null;
  relatedLessonIds?: string[];
};

/** Alterações de conteúdo publicado ficam fora das linhas visíveis à aluna até a publicação. */
export const learningNodeDrafts = pgTable(
  'learning_node_drafts',
  {
    kind: text('kind').notNull(),
    nodeId: uuid('node_id').notNull(),
    data: jsonb('data').$type<LearningNodeDraftData>().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.kind, table.nodeId] }),
    check(
      'learning_node_drafts_kind_check',
      sql`${table.kind} in ('track', 'stage', 'module', 'lesson', 'resource', 'banner')`,
    ),
    check('learning_node_drafts_data_check', sql`jsonb_typeof(${table.data}) = 'object'`),
  ],
);

/** Uma cópia da versão anterior permite desfazer a última publicação. */
export const learningNodeHistory = pgTable(
  'learning_node_history',
  {
    kind: text('kind').notNull(),
    nodeId: uuid('node_id').notNull(),
    data: jsonb('data').$type<LearningNodeDraftData>().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.kind, table.nodeId] }),
    check(
      'learning_node_history_kind_check',
      sql`${table.kind} in ('track', 'stage', 'module', 'lesson', 'resource', 'banner')`,
    ),
    check('learning_node_history_data_check', sql`jsonb_typeof(${table.data}) = 'object'`),
  ],
);

/** Posição e conclusão de cada aula pertencem à aluna, nunca ao conteúdo compartilhado. */
export const learningLessonProgress = pgTable(
  'learning_lesson_progress',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => learningLessons.id, { onDelete: 'cascade' }),
    lastPositionSeconds: integer('last_position_seconds').default(0).notNull(),
    completedAt: timestamp('completed_at'),
    lastViewedAt: timestamp('last_viewed_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.lessonId] }),
    index('learning_lesson_progress_user_viewed_idx').on(table.userId, table.lastViewedAt),
    check('learning_lesson_progress_position_check', sql`${table.lastPositionSeconds} >= 0`),
  ],
);

/** Lembra a última aula aberta em cada trilha para o botão "Continuar". */
export const learningTrackProgress = pgTable(
  'learning_track_progress',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    trackId: uuid('track_id')
      .notNull()
      .references(() => learningTracks.id, { onDelete: 'cascade' }),
    currentLessonId: uuid('current_lesson_id').references(() => learningLessons.id, {
      onDelete: 'set null',
    }),
    lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.trackId] }),
    index('learning_track_progress_user_accessed_idx').on(table.userId, table.lastAccessedAt),
  ],
);

/** Guarda a resposta da entrada do plano sem misturá-la ao progresso das aulas. */
export const sllPlanIntake = pgTable(
  'sll_plan_intake',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    storeAge: sllPlanStoreAge('store_age').notNull(),
    answeredAt: timestamp('answered_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('sll_plan_intake_store_age_idx').on(table.storeAge)],
);

export const learningTracksRelations = relations(learningTracks, ({ many }) => ({
  stages: many(learningStages),
}));

export const learningStagesRelations = relations(learningStages, ({ one, many }) => ({
  track: one(learningTracks, {
    fields: [learningStages.trackId],
    references: [learningTracks.id],
  }),
  modules: many(learningModules),
}));

export const learningModulesRelations = relations(learningModules, ({ one, many }) => ({
  stage: one(learningStages, {
    fields: [learningModules.stageId],
    references: [learningStages.id],
  }),
  lessons: many(learningLessons),
}));

export const learningLessonsRelations = relations(learningLessons, ({ one, many }) => ({
  module: one(learningModules, {
    fields: [learningLessons.moduleId],
    references: [learningModules.id],
  }),
  blocks: many(learningContentBlocks),
}));

export const learningContentBlocksRelations = relations(learningContentBlocks, ({ one }) => ({
  lesson: one(learningLessons, {
    fields: [learningContentBlocks.lessonId],
    references: [learningLessons.id],
  }),
}));
