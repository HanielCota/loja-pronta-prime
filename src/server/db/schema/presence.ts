import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * Onde cada aluna está agora: a página aberta e o último aviso dela (a cada 30s, só com a aba à
 * vista). Uma linha por conta, sobrescrita a cada aviso: não guarda histórico, IP nem localização.
 */
export const userPresence = pgTable(
  'user_presence',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Só o caminho (sem a busca do endereço), como `/sll/aula/<id>`. */
    path: text('path').notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
  },
  (table) => [index('user_presence_last_seen_idx').on(table.lastSeenAt)],
);
