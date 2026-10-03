import { sql } from 'drizzle-orm';
import { check, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
// Caminhos relativos: o drizzle-kit lê este arquivo fora do Next, sem os atalhos "@/".
import { BRAND_DESCRIPTION_MAX, BRAND_NAME_MAX } from '../../../config/brand';
import type { LogoConfig } from '../../../features/brand/logo/config';
import { user } from './auth';

/**
 * Marca da loja (fase 2 da Loja Pronta): o nome, o logo e a descrição que a aluna escolhe,
 * salvos a cada passo (pra ela continuar de onde parou). O logo é a receita do estúdio, não a
 * imagem: o desenho sai dela na hora (ver renderLogoSvg). `completedAt` marca a confirmação: a
 * loja passa pra fase 3.
 */
export const storeBrand = pgTable(
  'store_brand',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name'),
    logo: jsonb('logo').$type<LogoConfig>(),
    description: text('description'),
    completedAt: timestamp('completed_at'),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      'store_brand_name_check',
      sql`char_length(${table.name}) between 1 and ${sql.raw(String(BRAND_NAME_MAX))}`,
    ),
    check(
      'store_brand_description_check',
      sql`char_length(${table.description}) between 1 and ${sql.raw(String(BRAND_DESCRIPTION_MAX))}`,
    ),
    check('store_brand_logo_check', sql`jsonb_typeof(${table.logo}) = 'object'`),
    // Confirmada só com tudo escolhido.
    check(
      'store_brand_completed_check',
      sql`${table.completedAt} is null or (${table.name} is not null and ${table.logo} is not null and ${table.description} is not null)`,
    ),
  ],
);
