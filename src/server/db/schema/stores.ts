import { sql } from 'drizzle-orm';
import { check, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core';
// Caminho relativo: o drizzle-kit lê este arquivo fora do Next, sem os atalhos "@/".
import { STORE_PHASES } from '../../../config/store-phases';
import { user } from './auth';

/**
 * Loja que a equipe monta pra aluna da Loja Pronta, e a fase em que ela está (1 a 7, ver
 * src/config/store-phases.ts). Sem linha, a loja ainda está na primeira fase.
 */
export const stores = pgTable(
  'stores',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    phase: smallint('phase').default(1).notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      'stores_phase_check',
      sql`${table.phase} between 1 and ${sql.raw(String(STORE_PHASES.length))}`,
    ),
  ],
);
