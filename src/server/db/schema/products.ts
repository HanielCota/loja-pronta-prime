import { sql } from 'drizzle-orm';
import { check, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
// Caminho relativo: o drizzle-kit lê este arquivo fora do Next, sem os atalhos "@/".
import { PRODUCT_IDS } from '../../../config/products';
import { user } from './auth';

/**
 * Produtos que cada aluna tem (SLL, Loja Pronta ou os dois). Uma linha por produto liberado.
 * A integração com a Hotmart insere ao liberar e remove no reembolso daquele produto. A última e
 * a primeira visita servem pra saudação ("Bom te ver de novo") e pra sugerir a última área.
 */
export const studentProducts = pgTable(
  'student_products',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    product: text('product', { enum: PRODUCT_IDS }).notNull(),
    grantedAt: timestamp('granted_at').defaultNow().notNull(),
    /** Primeira e última vez que ela abriu a área do produto (vazias: nunca abriu). */
    firstVisitedAt: timestamp('first_visited_at'),
    lastVisitedAt: timestamp('last_visited_at'),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.product] }),
    check(
      'student_products_product_check',
      sql`${table.product} in (${sql.raw(PRODUCT_IDS.map((id) => `'${id}'`).join(', '))})`,
    ),
  ],
);
