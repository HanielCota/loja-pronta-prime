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
      <div className="flex flex-col gap-1 text-center">
        <h1
          id={TITLE_ID}
          tabIndex={-1}
          className="text-title font-semibold text-balance outline-none sm:text-title-lg"
        >
          Vamos criar o seu logo
        </h1>
        <p className="text-body text-pretty text-muted-foreground">
          Responda umas perguntas e eu crio o logo da {storeName}.
        </p>
      </div>
      <FocusOnArrival targetId={TITLE_ID} />
      <LogoChat initial={initial} editing={editing} />
    </>
  );
}
