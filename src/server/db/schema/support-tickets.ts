import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * Chamados do suporte. Quem escreveu ou agiu fica com `set null`: se a conta some (inclusive pela
 * exclusão da LGPD), a conversa e o histórico continuam, com o nome copiado na mensagem.
 */
export const supportTickets = pgTable(
  'support_tickets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    number: serial('number').notNull(),
    requesterId: text('requester_id').references(() => user.id, { onDelete: 'set null' }),
    requesterEmail: text('requester_email').notNull(),
    requesterName: text('requester_name').notNull(),
    subject: text('subject').notNull(),
    status: text('status', { enum: ['open', 'answered', 'closed'] })
      .default('open')
      .notNull(),
    queue: text('queue', { enum: ['general', 'ombudsman'] })
      .default('general')
      .notNull(),
    topicId: text('topic_id').notNull(),
    situationId: text('situation_id'),
    priority: text('priority', { enum: ['low', 'normal', 'high', 'urgent'] })
      .default('normal')
      .notNull(),
    assigneeId: text('assignee_id').references(() => user.id, { onDelete: 'set null' }),
    awaitingSince: timestamp('awaiting_since'),
    dueAt: timestamp('due_at'),
    firstResponseAt: timestamp('first_response_at'),
    closedAt: timestamp('closed_at'),
    closedReason: text('closed_reason', { enum: ['requester', 'staff', 'automatic'] }),
    product: text('product', { enum: ['loja-pronta', 'sll'] }),
    lessonId: text('lesson_id'),
    storePhase: smallint('store_phase'),
    errorDigest: text('error_digest'),
    pagePath: text('page_path'),
    channel: text('channel', { enum: ['platform', 'public_form'] })
      .default('platform')
      .notNull(),
    emailConfirmedAt: timestamp('email_confirmed_at'),
    assistantAnswerId: text('assistant_answer_id'),
    /** O id do envio do formulário: o mesmo envio repetido (rede lenta, clique duplo) não abre dois chamados. */
    submissionId: text('submission_id'),
    emailReplies: boolean('email_replies').default(true).notNull(),
    rating: smallint('rating'),
    ratingComment: text('rating_comment'),
    ratedAt: timestamp('rated_at'),
    /** Avisos de prazo perdido já mandados pra este atraso (o worker não repete). */
    lateNotifiedAt: timestamp('late_notified_at'),
    anonymizedAt: timestamp('anonymized_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('support_tickets_number_idx').on(table.number),
    uniqueIndex('support_tickets_submission_idx').on(table.submissionId),
    index('support_tickets_requester_idx').on(table.requesterId),
    index('support_tickets_status_assignee_idx').on(table.status, table.assigneeId),
    index('support_tickets_queue_status_idx').on(table.queue, table.status),
    index('support_tickets_due_idx').on(table.dueAt),
    index('support_tickets_topic_idx').on(table.topicId, table.situationId, table.createdAt),
    index('support_tickets_updated_idx').on(table.updatedAt),
    check('support_tickets_rating_check', sql`${table.rating} is null or ${table.rating} between 1 and 5`),
    check(
      'support_tickets_phase_check',
      sql`${table.storePhase} is null or ${table.storePhase} between 1 and 7`,
    ),
  ],
);

export const supportTicketMessages = pgTable(
  'support_ticket_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => supportTickets.id, { onDelete: 'cascade' }),
    authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
    authorName: text('author_name').notNull(),
    fromStaff: boolean('from_staff').default(false).notNull(),
    internal: boolean('internal').default(false).notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('support_ticket_messages_ticket_idx').on(table.ticketId, table.createdAt),
    index('support_ticket_messages_author_idx').on(table.authorId, table.createdAt),
  ],
);

export const supportTicketAttachments = pgTable(
  'support_ticket_attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => supportTickets.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id')
      .notNull()
      .references(() => supportTicketMessages.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    purgedAt: timestamp('purged_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('support_ticket_attachments_message_idx').on(table.messageId),
    index('support_ticket_attachments_ticket_idx').on(table.ticketId),
    check('support_ticket_attachments_size_check', sql`${table.sizeBytes} >= 0`),
  ],
);

/** O histórico (e a auditoria) do chamado. `id` sequencial: eventos do mesmo instante mantêm a ordem. */
export const supportTicketEvents = pgTable(
  'support_ticket_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => supportTickets.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    automatic: boolean('automatic').default(false).notNull(),
    type: text('type', {
      enum: [
        'status_changed',
        'assigned',
        'priority_changed',
        'topic_changed',
        'queue_changed',
        'rated',
        'deadline_missed',
        'impersonation_started',
      ],
    }).notNull(),
    fromValue: text('from_value'),
    toValue: text('to_value'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('support_ticket_events_ticket_idx').on(table.ticketId, table.id),
    index('support_ticket_events_type_idx').on(table.type, table.createdAt),
  ],
);

/** Até onde cada pessoa leu cada chamado. É o único "lido/não lido". */
export const supportTicketReads = pgTable(
  'support_ticket_reads',
  {
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => supportTickets.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.ticketId, table.userId] })],
);

/** Link mágico do chamado aberto sem login. Só o hash fica no banco. */
export const supportAccessTokens = pgTable(
  'support_access_tokens',
  {
    tokenHash: text('token_hash').primaryKey(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => supportTickets.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('support_access_tokens_ticket_idx').on(table.ticketId)],
);

/** Temas do chamado guiado. Os valores de fábrica moram no código (`catalog.ts`). */
export const supportTopics = pgTable('support_topics', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  question: text('question').notNull(),
  example: text('example').notNull(),
  position: integer('position').notNull(),
  active: boolean('active').default(true).notNull(),
  defaultAssigneeId: text('default_assignee_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const supportSituations = pgTable(
  'support_situations',
  {
    topicId: text('topic_id')
      .notNull()
      .references(() => supportTopics.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    label: text('label').notNull(),
    legend: text('legend'),
    priority: text('priority', { enum: ['normal', 'high'] })
      .default('normal')
      .notNull(),
    question: text('question').notNull(),
    example: text('example').notNull(),
    attachmentTip: text('attachment_tip').notNull(),
    notice: text('notice'),
    position: integer('position').notNull(),
    active: boolean('active').default(true).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.topicId, table.id] })],
);

export type WeeklyHoursRow = ({ opens: number; closes: number } | null)[];

/** Configurações do suporte: uma linha só (`id = 'main'`). */
export const supportSettings = pgTable('support_settings', {
  id: text('id').primaryKey(),
  weeklyHours: jsonb('weekly_hours').$type<WeeklyHoursRow>().notNull(),
  /** Prazo por prioridade, em minutos de atendimento. */
  deadlineMinutes: jsonb('deadline_minutes')
    .$type<Record<'low' | 'normal' | 'high' | 'urgent', number>>()
    .notNull(),
  autoCloseDays: integer('auto_close_days').default(7).notNull(),
  autoAssign: boolean('auto_assign').default(false).notNull(),
  maxOpenPerPerson: integer('max_open_per_person').default(15).notNull(),
  pausedUntil: timestamp('paused_until'),
  pauseMessage: text('pause_message'),
  attachmentRetentionDays: integer('attachment_retention_days').default(180).notNull(),
  ticketRetentionYears: integer('ticket_retention_years').default(5).notNull(),
  /** Respostas prontas e FAQ de fábrica já gravados (apagar um não faz ele voltar). */
  seededAt: timestamp('seeded_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const supportHolidays = pgTable('support_holidays', {
  date: text('date').primaryKey(),
  name: text('name').notNull(),
});

export const supportReplyTemplates = pgTable('support_reply_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  statusAfter: text('status_after', { enum: ['open', 'answered', 'closed'] }),
  position: integer('position').notNull(),
  active: boolean('active').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const supportFaqAnswers = pgTable(
  'support_faq_answers',
  {
    id: text('id').primaryKey(),
    topicId: text('topic_id').notNull(),
    situationId: text('situation_id'),
    title: text('title').notNull(),
    steps: jsonb('steps').$type<string[]>().notNull(),
    links: jsonb('links').$type<{ label: string; path: string }[]>().default([]).notNull(),
    active: boolean('active').default(true).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('support_faq_answers_topic_idx').on(table.topicId, table.situationId)],
);

export const supportFaqFeedback = pgTable(
  'support_faq_feedback',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    answerId: text('answer_id').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    topicId: text('topic_id').notNull(),
    situationId: text('situation_id'),
    resolved: boolean('resolved').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('support_faq_feedback_created_idx').on(table.createdAt)],
);

export const supportKnownIssues = pgTable(
  'support_known_issues',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    topicIds: jsonb('topic_ids').$type<string[]>().default([]).notNull(),
    startsAt: timestamp('starts_at').defaultNow().notNull(),
    endsAt: timestamp('ends_at'),
    createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('support_known_issues_period_idx').on(table.startsAt, table.endsAt)],
);

export const supportStaffStatus = pgTable('support_staff_status', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  available: boolean('available').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** Cliques nos links de WhatsApp das telas de suporte. Sem conteúdo de conversa. */
export const supportWhatsappClicks = pgTable(
  'support_whatsapp_clicks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    topic: text('topic').notNull(),
    source: text('source', { enum: ['platform', 'login'] }).notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('support_whatsapp_clicks_created_idx').on(table.createdAt)],
);

/**
 * O que alguém da equipe fez dentro da conta de uma aluna ("Entrar como aluna"): a entrada, cada
 * ação feita ou recusada e a saída. `action` é o nome da ação, nunca o conteúdo; `path` é só o
 * endereço. `session_id` junta os registros de uma mesma visita (a sessão some na saída, então
 * não é chave estrangeira).
 */
export const supportImpersonationLog = pgTable(
  'support_impersonation_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: text('kind', { enum: ['started', 'action', 'refused', 'ended'] })
      .default('action')
      .notNull(),
    sessionId: text('session_id'),
    staffId: text('staff_id').references(() => user.id, { onDelete: 'set null' }),
    studentId: text('student_id').references(() => user.id, { onDelete: 'set null' }),
    ticketId: uuid('ticket_id').references(() => supportTickets.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    path: text('path'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('support_impersonation_log_student_idx').on(table.studentId, table.createdAt),
    index('support_impersonation_log_session_idx').on(table.sessionId),
    // Uma saída por visita: um clique duplo em "Voltar ao painel" não grava a saída duas vezes.
    uniqueIndex('support_impersonation_log_ended_idx')
      .on(table.sessionId)
      .where(sql`${table.kind} = 'ended'`),
  ],
);

/**
 * O que a equipe fez na equipe e nas configurações. Conta apagada: o registro fica, sem a pessoa
 * (`set null`). `detail` nunca leva e-mail nem texto escrito, só ids e valores (cargo, data).
 */
export const staffAuditLog = pgTable(
  'staff_audit_log',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    area: text('area', { enum: ['team', 'settings'] }).notNull(),
    action: text('action').notNull(),
    targetId: text('target_id'),
    detail: jsonb('detail').$type<Record<string, string | number | boolean | null>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('staff_audit_log_created_idx').on(table.createdAt),
    index('staff_audit_log_area_idx').on(table.area, table.createdAt),
    index('staff_audit_log_actor_idx').on(table.actorId, table.createdAt),
  ],
);
