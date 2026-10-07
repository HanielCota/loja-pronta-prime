import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
// Caminho relativo: o drizzle-kit lê este arquivo fora do Next, sem os atalhos "@/".
import type { DeviceClient } from '../../../features/presence/device';
import { user } from './auth';

/**
 * Onde cada aluna está agora: a página aberta e o último aviso dela (a cada 30s, só com a aba à
 * vista). Uma linha por conta, sobrescrita a cada aviso: não guarda histórico, IP nem localização.
 * O aparelho vem do user agent e do que o próprio navegador conta (tela, idioma, fuso...).
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
    /** Como o navegador se apresenta (sistema, navegador, às vezes o modelo). */
    userAgent: text('user_agent'),
    /** O que a página conta do aparelho; ver `deviceClientSchema`. */
    device: jsonb('device').$type<DeviceClient>(),
  },
  (table) => [index('user_presence_last_seen_idx').on(table.lastSeenAt)],
);
