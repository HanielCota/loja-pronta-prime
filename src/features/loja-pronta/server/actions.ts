'use server';

import { runAsStudent } from '@/features/support/server/impersonation';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getVideo } from '@/features/videos/server/videos';
import { db } from '@/server/db';
import { storeOnboarding, stores } from '@/server/db/schema';
import {
  canOpen,
  DONE_PATH,
  VIDEO_PATH,
  findQuestion,
  isStep,
  nextStep,
  resumeStep,
  REVIEW_STEP,
  stepPath,
} from '../steps';
import { parseAnswer } from '../answers';
import { parseWhatsapp, WHATSAPP_EXAMPLE } from '../whatsapp';
import { requireConversationAction } from './conversation';

/** Resposta pra tela quando algo não passa (sem erro, a action redireciona). */
export type StepResult = { error?: string } | undefined;

/**
 * Salva a resposta de uma pergunta e leva pra próxima (ou de volta pra revisão, quando ela veio
 * de lá pra editar ou está revendo a conversa já enviada). Salvar a cada pergunta é o que deixa
 * ela continuar de onde parou.
 */
export async function saveAnswer(_state: StepResult, formData: FormData): Promise<StepResult> {
  return runAsStudent('saveAnswer', async () => {
    const { userId, onboarding, revising } = await requireConversationAction();

    const step = String(formData.get('step') ?? '');
    const question = isStep(step) ? findQuestion(step) : undefined;
    if (!isStep(step) || !question) {
      return { error: 'Não encontramos essa pergunta. Recarregue a página.' };
    }
    // Sem pular pergunta (a página já impede; aqui, por quem chama a action direto).
    if (!canOpen(step, onboarding.answers)) redirect(stepPath(resumeStep(onboarding.answers)));

    const parsed = parseAnswer(question, formData);
    if (!parsed.ok) return { error: parsed.error };

    // Junta com as respostas que já estavam lá (jsonb `||`): só esta pergunta muda.
    const patch = JSON.stringify({ [question.id]: parsed.value });
    await db
      .insert(storeOnboarding)
      .values({ userId, answers: { [question.id]: parsed.value } })
      .onConflictDoUpdate({
        target: storeOnboarding.userId,
        // Enviada ou não, a guarda acima já decidiu que ela pode mudar (revendo, até a publicação).
        set: { answers: sql`${storeOnboarding.answers} || ${patch}::jsonb` },
      });

    redirect(
      formData.get('editing') || revising ? stepPath(REVIEW_STEP) : stepPath(nextStep(step)),
    );
  });
}

/**
 * Última etapa: confirma o WhatsApp e envia a conversa. A loja passa pra fase 2: ela já pode
 * criar a marca. Revendo (conversa já enviada), só troca o número de contato salvo.
 */
export async function finishConversation(
  _state: StepResult,
  formData: FormData,
): Promise<StepResult> {
  return runAsStudent('finishConversation', async () => {
    const { userId, onboarding, revising } = await requireConversationAction();

    const whatsapp = parseWhatsapp(String(formData.get('whatsapp') ?? ''));
    if (!whatsapp) {
      return { error: `Confira o número com DDD, como ${WHATSAPP_EXAMPLE}.` };
    }

    if (revising) {
      await db.update(storeOnboarding).set({ whatsapp }).where(eq(storeOnboarding.userId, userId));
      redirect(stepPath(REVIEW_STEP));
    }

    // Alguma pergunta ficou sem resposta (outra aba, envio direto): volta pra ela.
    const missing = resumeStep(onboarding.answers);
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

    // Com o vídeo de orientação enviado, ele vem antes do "pronto".
    redirect((await getVideo('orientacao')) ? VIDEO_PATH : DONE_PATH);
  });
}
