import { sql } from 'drizzle-orm';
import { check, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
// Caminhos relativos: o drizzle-kit lê este arquivo fora do Next, sem os atalhos "@/".
import { BRAND_DESCRIPTION_MAX, BRAND_NAME_MAX } from '../../../config/brand';
import type { LogoConfig } from '../../../features/brand/logo/config';
import type { LogoScene } from '../../../features/brand/logo/scene';
import { user } from './auth';

/**
 * Marca da loja (fase 2 da Loja Pronta): o nome, o logo e a descrição que a aluna escolhe,
 * salvos a cada passo (pra ela continuar de onde parou). O logo é a receita do estúdio, não a
 * imagem: o desenho sai dela na hora (ver renderLogoSvg). `logoScene`: o logo montado no editor;
 * quando existe, é ele que vale (o `logo` fica como o modelo de onde ela partiu). Escolher outro
 * modelo apaga a cena. `completedAt` marca a confirmação: a loja passa pra fase 3.
 */
export const storeBrand = pgTable(
  'store_brand',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name'),
    logo: jsonb('logo').$type<LogoConfig>(),
    logoScene: jsonb('logo_scene').$type<LogoScene>(),
    /** As outras versões do logo no editor livre (a da vez é a `logoScene`). */
    logoVariations: jsonb('logo_variations').$type<LogoScene[]>(),
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
    check(
      'store_brand_logo_variations_check',
      sql`${table.logoVariations} is null or jsonb_typeof(${table.logoVariations}) = 'array'`,
    ),
    // Cena só por cima de um modelo: os formatos do editor partem dele.
    check(
      'store_brand_logo_scene_check',
      sql`${table.logoScene} is null or (jsonb_typeof(${table.logoScene}) = 'object' and ${table.logo} is not null)`,
    ),
    // Confirmada só com tudo escolhido.
    check(
      'store_brand_completed_check',
      sql`${table.completedAt} is null or (${table.name} is not null and ${table.logo} is not null and ${table.description} is not null)`,
    ),
  ],
);
