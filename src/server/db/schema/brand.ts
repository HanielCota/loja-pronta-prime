import { sql } from 'drizzle-orm';
import { check, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
// Caminhos relativos: o drizzle-kit lê este arquivo fora do Next, sem os atalhos "@/".
import { BRAND_DESCRIPTION_MAX, BRAND_NAME_MAX } from '../../../config/brand';
import type { LogoPicks, StudioLogo } from '../../../features/brand/logo-studio/model';
import { user } from './auth';

/**
 * Marca da loja (fase 2 da Loja Pronta): o nome, o logo e a descrição que a aluna escolhe,
 * salvos a cada passo (pra ela continuar de onde parou). `logoImage`: a chave, no armazenamento,
 * do logo que ela escolheu no estúdio (uma imagem PNG). `completedAt` marca a confirmação: a loja
 * passa pra fase 3. A confirmação pede o logo na tela (finishBrand), não aqui: marcas confirmadas
 * antes do chat do logo ficaram sem imagem e criam o logo de novo ao rever.
 */
export const storeBrand = pgTable(
  'store_brand',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name'),
    logoImage: text('logo_image'),
    description: text('description'),
    completedAt: timestamp('completed_at'),
    publicationFingerprint: text('publication_fingerprint'),
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
    check('store_brand_logo_image_check', sql`char_length(${table.logoImage}) between 1 and 200`),
    // Confirmada só com nome e texto (o logo, ver acima).
    check(
      'store_brand_completed_check',
      sql`${table.completedAt} is null or (${table.name} is not null and ${table.description} is not null)`,
    ),
  ],
);

/**
 * O estúdio do logo de cada aluna: as escolhas (pra ela sair e voltar de onde parou), os logos
 * criados ou enviados (em ordem), quantos ela já gerou e quantos mandou (os limites seguram o
 * custo e nunca voltam a zero).
 */
export const logoStudio = pgTable(
  'logo_studio',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    picks: jsonb('picks').$type<LogoPicks>().notNull().default({}),
    logos: jsonb('logos').$type<StudioLogo[]>().notNull().default([]),
    generations: integer('generations').notNull().default(0),
    uploads: integer('uploads').notNull().default(0),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check('logo_studio_picks_check', sql`jsonb_typeof(${table.picks}) = 'object'`),
    check('logo_studio_logos_check', sql`jsonb_typeof(${table.logos}) = 'array'`),
    check('logo_studio_generations_check', sql`${table.generations} >= 0`),
    check('logo_studio_uploads_check', sql`${table.uploads} >= 0`),
  ],
);

/** Approval belongs to an exact draft and brand snapshot. */
export const storeBannerKits = pgTable('store_banner_kits', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  revision: text('revision').notNull(),
  brandFingerprint: text('brand_fingerprint').notNull(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  palette: text('palette', { enum: ['violet', 'rose', 'ocean', 'forest'] }).notNull(),
  approvedAt: timestamp('approved_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
