import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import type { OnboardingAnswers } from '@/config/onboarding';
import { getActiveSession, needsFirstPassword } from '@/features/auth/server/session';
import { getStudentProducts, requireProduct } from '@/features/products/server/access';
import { db } from '@/server/db';
import { storeOnboarding } from '@/server/db/schema';
import { cleanAnswers } from '../answers';
import { getStorePhase } from './store';

export type Onboarding = {
  answers: OnboardingAnswers;
  whatsapp: string | null;
  completedAt: Date | null;
};

const EMPTY: Onboarding = { answers: {}, whatsapp: null, completedAt: null };

/** Respostas da conversa inicial (sem linha: ainda não respondeu nada). */
export async function getOnboarding(userId: string): Promise<Onboarding> {
  const [row] = await db
    .select({
      answers: storeOnboarding.answers,
      whatsapp: storeOnboarding.whatsapp,
      completedAt: storeOnboarding.completedAt,
    })
    .from(storeOnboarding)
    .where(eq(storeOnboarding.userId, userId));
  // Só as respostas que ainda valem com as perguntas de hoje (ver cleanAnswers).
  return row ? { ...row, answers: cleanAnswers(row.answers) } : EMPTY;
}

/**
 * Páginas da conversa: só pra quem tem a Loja Pronta, com a conversa ainda não enviada e a loja
 * até a fase 2 (na 2 sem a conversa, ela ainda vê a fase 1: ver displayedPhase). Depois do envio, as perguntas levam de volta pra área (a tela de "pronto" tem a
 * própria regra).
 */
export async function requireConversation(path: string) {
  const student = await requireProduct('loja-pronta', path);
  const userId = student.session.user.id;
  const [onboarding, phase] = await Promise.all([getOnboarding(userId), getStorePhase(userId)]);
  if (onboarding.completedAt || phase > 2) redirect('/loja-pronta');
  return { student, onboarding };
}

/**
 * Mesma regra, pras Server Actions (que podem ser chamadas direto, sem passar pela página).
 * Devolve o id da aluna.
 */
export async function requireConversationAction(): Promise<string> {
  const session = await getActiveSession();
  if (!session || needsFirstPassword(session.user)) redirect('/entrar');
  const userId = session.user.id;
  const [{ products }, onboarding, phase] = await Promise.all([
    getStudentProducts(userId),
    getOnboarding(userId),
    getStorePhase(userId),
  ]);
  if (!products.includes('loja-pronta') || onboarding.completedAt || phase > 2) {
    redirect('/loja-pronta');
  }
  return userId;
}
