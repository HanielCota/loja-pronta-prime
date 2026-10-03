import { BRAND_NAME_MAX } from '@/config/brand';
import type { OnboardingAnswers } from '@/config/onboarding';
import { FocusOnArrival } from '@/features/loja-pronta/components/focus-on-arrival';
import { MascotBubble } from '@/features/loja-pronta/components/mascot-bubble';
import { parseBrandName } from '../fields';
import { fontForStyle } from '../logo/fonts';
import { BRAND_PATH } from '../steps';
import { saveBrandName } from '../server/actions';
import { nameSuggestions } from '../suggestions';
import { BrandForm } from './brand-form';
import { NamePicker } from './name-picker';

const TITLE_ID = 'nome-titulo';
const FIELD_ID = 'nome-da-loja';

/** Ideias guardadas pro "Mais ideias" (3 trocas de 6). */
const IDEAS = 18;

type NameStepProps = {
  answers: OnboardingAnswers;
  studentName: string;
  saved: string | null;
  editing: boolean;
};

/**
 * Passo 1: o nome da loja. Um cartão grande com o nome que ela já tem (o salvo ou o da conversa),
 * que é o próprio campo; embaixo, ideias que escrevem no cartão, e um botão só pra seguir. Os
 * nomes aparecem na letra do estilo dela, como no logo.
 */
export function NameStep({ answers, studentName, saved, editing }: NameStepProps) {
  const fromConversation = typeof answers.nome === 'string' ? answers.nome : undefined;
  // O nome da conversa só vira ideia se a Shopee aceitar; senão, fica só no cartão, pra ela ajustar.
  const usable =
    fromConversation && parseBrandName(fromConversation).ok ? fromConversation : undefined;
  const featured = saved ?? usable;
  const ideas = nameSuggestions(answers, studentName, IDEAS).filter((name) => name !== featured);
  const font = fontForStyle(typeof answers.estilo === 'string' ? answers.estilo : undefined);

  return (
    <>
      {/* A letra do logo, servida pela rota das fontes da marca (o navegador guarda de vez). */}
      <style>{`@font-face{font-family:'Letra da marca';src:url('${BRAND_PATH}/fontes/${font}') format('woff');font-display:swap}`}</style>
      <MascotBubble compact title="Qual o nome da sua loja?" titleId={TITLE_ID} />
      <FocusOnArrival targetId={TITLE_ID} />
      <BrandForm action={saveBrandName} editing={editing}>
        <NamePicker
          id={FIELD_ID}
          initial={featured ?? fromConversation ?? ''}
          featured={featured}
          ideas={ideas}
          max={BRAND_NAME_MAX}
        />
      </BrandForm>
    </>
  );
}
