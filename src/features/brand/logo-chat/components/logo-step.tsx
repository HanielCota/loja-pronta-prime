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
      {/* O título fica pro leitor de tela (e pro foco ao chegar): na tela, quem abre a conversa é
          a primeira fala da assistente, como no ChatGPT. */}
      <h1 id={TITLE_ID} tabIndex={-1} className="sr-only">
        Vamos criar o logo da {storeName}
      </h1>
      <FocusOnArrival targetId={TITLE_ID} />
      <LogoChat initial={initial} editing={editing} />
    </>
  );
}
