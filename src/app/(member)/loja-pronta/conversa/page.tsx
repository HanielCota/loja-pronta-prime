import { redirect } from 'next/navigation';
import { requireConversation } from '@/features/loja-pronta/server/conversation';
import { CONVERSATION_PATH, resumeStep, REVIEW_STEP, stepPath } from '@/features/loja-pronta/steps';

/**
 * Entrada da conversa: leva pra onde ela parou (a primeira pergunta sem resposta). Revendo a
 * conversa já enviada, direto pras respostas.
 */
export default async function ConversationPage() {
  const { onboarding, revising } = await requireConversation(CONVERSATION_PATH);
  redirect(stepPath(revising ? REVIEW_STEP : resumeStep(onboarding.answers)));
}
