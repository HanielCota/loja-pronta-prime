import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
// Caminho relativo: o drizzle-kit lê este arquivo fora do Next, sem os atalhos "@/".
import type { OnboardingAnswers } from '../../../config/onboarding';
import { user } from './auth';

/**
 * Conversa inicial da Loja Pronta (fase 1): as respostas da aluna, salvas a cada pergunta (pra
 * ela continuar de onde parou), e o WhatsApp que ela confirma no fim. `completedAt` marca o
 * envio: a loja passa pra fase 2 e a equipe começa a criar o logo e a descrição.
 */
export const storeOnboarding = pgTable('store_onboarding', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  answers: jsonb('answers').$type<OnboardingAnswers>().default({}).notNull(),
  /** Só dígitos, com DDD (10 ou 11). */
  whatsapp: text('whatsapp'),
  completedAt: timestamp('completed_at'),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
