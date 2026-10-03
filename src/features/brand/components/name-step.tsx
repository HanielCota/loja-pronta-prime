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
import { ConfirmNameButton, NameIdeas, PREVIEW_FONT, WriteOwnNameLink } from './name-choices';
import { OwnNameField } from './own-name-field';

const TITLE_ID = 'nome-titulo';
const HELP_ID = 'nome-ajuda';
const OWN_FIELD_ID = 'nome-proprio';

/** Ideias guardadas pro "Outras ideias" (3 trocas de 6). */
const IDEAS = 18;

type NameStepProps = {
  answers: OnboardingAnswers;
  studentName: string;
  saved: string | null;
  editing: boolean;
};

/**
 * Passo 1: o nome da loja. Em destaque, o nome que ela já tem (o salvo, o que escreveu ou o da
 * conversa), com um botão claro pra seguir com ele. Embaixo, ideias prontas (um toque escolhe e
 * segue) e o campo pra escrever outro. Os nomes aparecem na letra do estilo dela, como no logo.
 */
export function NameStep({ answers, studentName, saved, editing }: NameStepProps) {
  const fromConversation = typeof answers.nome === 'string' ? answers.nome : undefined;
  // O nome da conversa só vira destaque se a Shopee aceitar; senão, vai pro campo, pra ela ajustar.
  const usable =
    fromConversation && parseBrandName(fromConversation).ok ? fromConversation : undefined;
  const pool = nameSuggestions(answers, studentName, IDEAS);
  const featured = saved ?? usable;
  const ideas = pool.filter((name) => name !== featured);
  const custom = saved && saved !== usable && !pool.includes(saved) ? saved : undefined;
  const featuredDetail =
    featured === usable
      ? 'O nome que você escolheu na conversa'
      : custom
        ? 'O nome que você escreveu'
        : 'O nome que você escolheu';
  const font = fontForStyle(typeof answers.estilo === 'string' ? answers.estilo : undefined);

  return (
    <>
      {/* A letra do logo, servida pela rota das fontes da marca (o navegador guarda de vez). */}
      <style>{`@font-face{font-family:'Letra da marca';src:url('${BRAND_PATH}/fontes/${font}') format('woff');font-display:swap}`}</style>
      <MascotBubble
        compact
        title={featured ? 'Esse vai ser o nome da sua loja?' : 'Vamos escolher o nome da sua loja'}
        help={
          featured
            ? 'Dá pra mudar depois, quando quiser.'
            : 'Escolha um nome das ideias ou escreva o seu. Dá pra mudar depois.'
        }
        titleId={TITLE_ID}
        helpId={HELP_ID}
      />
      <FocusOnArrival targetId={TITLE_ID} />

      {featured ? (
        <BrandForm action={saveBrandName} editing={editing} className="gap-4">
          <div className="flex flex-col items-center gap-1 rounded-card bg-card px-6 py-8 text-center shadow-card forced-colors:border forced-colors:border-[CanvasText]">
            <p
              className="text-3xl leading-tight text-balance break-words sm:text-4xl"
              style={{ fontFamily: PREVIEW_FONT }}
            >
              {featured}
            </p>
            <p className="text-sm text-muted-foreground">{featuredDetail}</p>
          </div>
          <ConfirmNameButton
            name={featured}
            label={saved ? 'Continuar com esse nome' : 'Sim, quero esse nome'}
          />
          <WriteOwnNameLink fieldId={OWN_FIELD_ID} />
        </BrandForm>
      ) : null}

      <BrandForm action={saveBrandName} editing={editing}>
        <h2 className="text-body font-semibold">
          {featured ? 'Ou escolha uma das nossas ideias' : 'Nossas ideias pra você'}
        </h2>
        <NameIdeas ideas={ideas} saved={saved} />
      </BrandForm>

      <BrandForm action={saveBrandName} editing={editing} className="gap-4">
        <h2 className="text-body font-semibold">Prefere escrever outro nome?</h2>
        <OwnNameField
          id={OWN_FIELD_ID}
          initial={fromConversation && !usable ? fromConversation : (custom ?? '')}
          max={BRAND_NAME_MAX}
        />
      </BrandForm>
    </>
  );
}
