import type { OnboardingAnswers } from '@/config/onboarding';
import { FocusOnArrival } from '@/features/loja-pronta/components/focus-on-arrival';
import { loadChatView } from '../server/load';
import { LogoChat } from './logo-chat';

const TITLE_ID = 'logo-titulo';

/**
 * Passo 2: o logo, conversando. A assistente pergunta (uma coisa por vez, com respostas rápidas),
 * monta o resumo e cria o logo; ela escolhe um e segue.
 */
export async function LogoStep({
  userId,
  storeName,
  studentName,
  answers,
  editing,
}: {
  userId: string;
  storeName: string;
  studentName: string;
  answers: OnboardingAnswers;
  editing: boolean;
}) {
  const initial = await loadChatView(userId, { storeName, studentName, answers });
  return (
    <>
      <FocusOnArrival targetId={TITLE_ID} />
      <LogoChat initial={initial} editing={editing} storeName={storeName} titleId={TITLE_ID} />
    </>
  );
}
