import type { OnboardingAnswers } from '@/config/onboarding';
import { env } from '@/config/env';
import { FocusOnArrival } from '@/features/loja-pronta/components/focus-on-arrival';
import { studioSuggestions } from '../picks';
import { loadStudioView } from '../server/load';
import { LogoStudio } from './logo-studio';

const TITLE_ID = 'logo-titulo';

/**
 * Passo 2: o logo, escolhendo vendo. Uma escolha por tela (tipo, desenho, cores, letras, fundo e
 * acabamento), com o rascunho do logo mudando a cada toque; depois a IA desenha a versão final e
 * ela escolhe um logo e segue.
 */
export async function LogoStep({
  userId,
  storeName,
  answers,
  oldName,
  editing,
}: {
  userId: string;
  storeName: string;
  answers: OnboardingAnswers;
  /** Ela acabou de mudar o nome da loja (vem da tela do nome). */
  oldName: string | undefined;
  editing: boolean;
}) {
  const initial = await loadStudioView(userId);
  return (
    <>
      <FocusOnArrival targetId={TITLE_ID} />
      <LogoStudio
        initial={initial}
        suggestions={studioSuggestions(answers)}
        storeName={storeName}
        oldName={oldName}
        editing={editing}
        titleId={TITLE_ID}
        speechAvailable={Boolean(env.OPENAI_API_KEY)}
      />
    </>
  );
}
