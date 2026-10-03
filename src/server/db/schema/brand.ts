import { sql } from 'drizzle-orm';
import { check, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
// Caminhos relativos: o drizzle-kit lê este arquivo fora do Next, sem os atalhos "@/".
import { BRAND_DESCRIPTION_MAX, BRAND_NAME_MAX } from '../../../config/brand';
import type { LogoBrief, LogoChatMessage } from '../../../features/brand/logo-chat/model';
import { user } from './auth';

/**
 * Marca da loja (fase 2 da Loja Pronta): o nome, o logo e a descrição que a aluna escolhe,
 * salvos a cada passo (pra ela continuar de onde parou). `logoImage`: a chave, no armazenamento,
 * do logo que ela escolheu no chat (uma imagem PNG). `completedAt` marca a confirmação: a loja
 * passa pra fase 3. A confirmação pede o logo na tela (finishBrand), não aqui: marcas confirmadas
 * antes do chat ficaram sem imagem e criam o logo de novo ao rever.
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
 * A conversa do chat do logo de cada aluna: as mensagens (pra ela sair e voltar de onde parou),
 * o resumo que a conversa montou, quantos logos ela já gerou e quantas respostas da IA já pediu
 * (os limites seguram o custo).
 */
export const logoChat = pgTable(
  'logo_chat',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    messages: jsonb('messages').$type<LogoChatMessage[]>().notNull().default([]),
    brief: jsonb('brief').$type<LogoBrief>(),
    generations: integer('generations').notNull().default(0),
    /** Respostas da IA que ela já pediu (nunca volta a zero, nem ao recomeçar: segura o custo). */
    turns: integer('turns').notNull().default(0),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check('logo_chat_messages_check', sql`jsonb_typeof(${table.messages}) = 'array'`),
    check('logo_chat_generations_check', sql`${table.generations} >= 0`),
    check('logo_chat_turns_check', sql`${table.turns} >= 0`),
  ],
);
