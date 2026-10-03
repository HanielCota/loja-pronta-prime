import { redirect } from 'next/navigation';
import { requireConversation } from '@/features/onboarding/server/conversation';
import { CONVERSATION_PATH, resumeStep, stepPath } from '@/features/onboarding/steps';

/** Entrada da conversa: leva pra onde ela parou (a primeira pergunta sem resposta). */
export default async function ConversationPage() {
  const { onboarding } = await requireConversation(CONVERSATION_PATH);
  redirect(stepPath(resumeStep(onboarding.answers)));
}
