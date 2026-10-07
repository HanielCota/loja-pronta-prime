import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { OnboardingAnswers } from '@/config/onboarding';
import { requireProduct, requireProductAction } from '@/features/products/server/access';
import { db } from '@/server/db';
import { storeOnboarding } from '@/server/db/schema';
import { cleanAnswers, legacyStoreName } from '../answers';
import { canReviseDonePhases } from '../editing';
import { getStorePhase } from './store';

export type Onboarding = {
  answers: OnboardingAnswers;
  whatsapp: string | null;
  completedAt: Date | null;
  /** O nome da loja respondido na conversa antiga (ver legacyStoreName). */
  storeName: string | null;
};

const EMPTY: Onboarding = { answers: {}, whatsapp: null, completedAt: null, storeName: null };

/** Respostas da conversa inicial (sem linha: ainda não respondeu nada). Lidas uma vez por requisição. */
export const getOnboarding = cache(async (userId: string): Promise<Onboarding> => {
  const [row] = await db
    .select({
      answers: storeOnboarding.answers,
      whatsapp: storeOnboarding.whatsapp,
      completedAt: storeOnboarding.completedAt,
    })
    .from(storeOnboarding)
    .where(eq(storeOnboarding.userId, userId));
  // Só as respostas que ainda valem com as perguntas de hoje (ver cleanAnswers).
  if (!row) return EMPTY;
  return { ...row, answers: cleanAnswers(row.answers), storeName: legacyStoreName(row.answers) };
});

/**
 * Quem pode abrir a conversa e como: respondendo (ainda não enviada, loja até a fase 2: na 2 sem a
 * conversa, ela ainda vê a fase 1, ver displayedPhase) ou revendo (já enviada, antes da
 * publicação: cada mudança fica salva, sem voltar de fase). Fora disso, nada.
 */
function conversationAccess(onboarding: Onboarding, phase: number) {
  if (!onboarding.completedAt) return phase <= 2 ? 'answering' : null;
  return canReviseDonePhases(phase) ? 'revising' : null;
}

/**
 * Páginas da conversa: só pra quem tem a Loja Pronta e pode responder ou rever (ver acima). Fora
 * disso, as perguntas levam de volta pra área (a tela de "pronto" tem a própria regra).
 */
export async function requireConversation(path: string) {
  const student = await requireProduct('loja-pronta', path);
  const userId = student.session.user.id;
  const [onboarding, phase] = await Promise.all([getOnboarding(userId), getStorePhase(userId)]);
  const access = conversationAccess(onboarding, phase);
  if (!access) redirect('/loja-pronta');
  return { student, onboarding, revising: access === 'revising' };
}

/**
 * Mesma regra, pras Server Actions (que podem ser chamadas direto, sem passar pela página).
 */
export async function requireConversationAction() {
  const { userId } = await requireProductAction('loja-pronta');
  const [onboarding, phase] = await Promise.all([getOnboarding(userId), getStorePhase(userId)]);
  const access = conversationAccess(onboarding, phase);
  if (!access) redirect('/loja-pronta');
  return { userId, onboarding, revising: access === 'revising' };
}
