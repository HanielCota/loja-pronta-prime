'use server';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { storeOnboarding, stores } from '@/server/db/schema';
import {
  DONE_PATH,
  findQuestion,
  isStep,
  nextStep,
  resumeStep,
  REVIEW_STEP,
  stepPath,
} from '../steps';
import { parseAnswer } from '../answers';
import { parseWhatsapp } from '../whatsapp';
import { getOnboarding, requireConversationAction } from './conversation';

/** Resposta pra tela quando algo não passa (sem erro, a action redireciona). */
export type StepResult = { error?: string } | undefined;

/**
 * Salva a resposta de uma pergunta e leva pra próxima (ou de volta pra revisão, quando ela veio
 * de lá pra editar). Salvar a cada pergunta é o que deixa ela continuar de onde parou.
 */
export async function saveAnswer(_state: StepResult, formData: FormData): Promise<StepResult> {
  const userId = await requireConversationAction();

  const step = String(formData.get('step') ?? '');
  const question = isStep(step) ? findQuestion(step) : undefined;
  if (!isStep(step) || !question) {
    return { error: 'Não encontramos essa pergunta. Recarregue a página.' };
  }

  const parsed = parseAnswer(question, formData);
  if (!parsed.ok) return { error: parsed.error };

  // Junta com as respostas que já estavam lá (jsonb `||`): só esta pergunta muda.
  const patch = JSON.stringify({ [question.id]: parsed.value });
  await db
    .insert(storeOnboarding)
    .values({ userId, answers: { [question.id]: parsed.value } })
    .onConflictDoUpdate({
      target: storeOnboarding.userId,
      set: { answers: sql`${storeOnboarding.answers} || ${patch}::jsonb` },
      // Outra aba pode ter enviado a conversa entre a guarda e este update: enviada, não muda.
      setWhere: isNull(storeOnboarding.completedAt),
    });

  redirect(formData.get('editing') ? stepPath(REVIEW_STEP) : stepPath(nextStep(step)));
}

/**
 * Última etapa: confirma o WhatsApp e envia a conversa. A loja passa pra fase 2, e a equipe
 * começa a criar o logo e a descrição.
 */
export async function finishConversation(
  _state: StepResult,
  formData: FormData,
): Promise<StepResult> {
  const userId = await requireConversationAction();

  const whatsapp = parseWhatsapp(String(formData.get('whatsapp') ?? ''));
  if (!whatsapp) {
    return { error: 'Confira o número com DDD, como (11) 98765-4321.' };
  }

  // Alguma pergunta ficou sem resposta (outra aba, envio direto): volta pra ela.
  const { answers } = await getOnboarding(userId);
  const missing = resumeStep(answers);
  if (missing !== REVIEW_STEP) redirect(stepPath(missing));

  await db.transaction(async (tx) => {
    await tx
      .update(storeOnboarding)
      .set({ whatsapp, completedAt: new Date() })
      .where(and(eq(storeOnboarding.userId, userId), isNull(storeOnboarding.completedAt)));
    // Só avança quem está na fase 1 (a guarda já confere; isto evita voltar uma loja à fase 2).
    await tx
      .insert(stores)
      .values({ userId, phase: 2 })
      .onConflictDoUpdate({
        target: stores.userId,
        set: { phase: 2 },
        setWhere: eq(stores.phase, 1),
      });
  });

  redirect(DONE_PATH);
}
