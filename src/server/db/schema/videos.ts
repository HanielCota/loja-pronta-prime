import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * O vídeo de cada lugar da jornada (src/config/videos.ts): a chave do arquivo no bucket, o tipo,
 * o tamanho e `captionsKey`, a legenda (WebVTT), quando enviada. Sem linha, o lugar ainda não tem
 * vídeo (a tela dele não aparece). O painel troca o arquivo; a troca só muda esta linha (o
 * arquivo antigo sai depois).
 */
export const videos = pgTable(
  'videos',
  {
    slot: text('slot').primaryKey(),
    key: text('key').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    captionsKey: text('captions_key'),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check('videos_key_check', sql`char_length(${table.key}) between 1 and 200`),
    check('videos_size_check', sql`${table.size} > 0`),
  ],
);
