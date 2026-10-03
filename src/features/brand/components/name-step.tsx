import { CheckIcon } from 'lucide-react';
import { BRAND_NAME_MAX } from '@/config/brand';
import type { OnboardingAnswers } from '@/config/onboarding';
import { FocusOnArrival } from '@/features/loja-pronta/components/focus-on-arrival';
import { MascotBubble } from '@/features/loja-pronta/components/mascot-bubble';
import { parseBrandName } from '../fields';
import { saveBrandName } from '../server/actions';
import { nameSuggestions } from '../suggestions';
import { BrandForm, ChoiceButton } from './brand-form';
import { OwnNameField } from './own-name-field';

const TITLE_ID = 'nome-titulo';
const HELP_ID = 'nome-ajuda';

type NameStepProps = {
  answers: OnboardingAnswers;
  studentName: string;
  saved: string | null;
  editing: boolean;
};

/**
 * Passo 1: o nome da loja. O que ela escreveu na conversa vem primeiro; depois, ideias prontas.
 * Cada nome é um botão (um toque escolhe e segue). Embaixo, o campo pra escrever outro.
 */
export function NameStep({ answers, studentName, saved, editing }: NameStepProps) {
  const fromConversation = typeof answers.nome === 'string' ? answers.nome : undefined;
  // O nome da conversa só vira botão se a Shopee aceitar; senão, vai pro campo, pra ela ajustar.
  const usable =
    fromConversation && parseBrandName(fromConversation).ok ? fromConversation : undefined;
  const ideas = nameSuggestions(answers, studentName).filter((name) => name !== usable);
  const custom = saved && saved !== usable && !ideas.includes(saved) ? saved : undefined;

  return (
    <>
      <MascotBubble
        title={usable ? 'Esse vai ser o nome da sua loja?' : 'Vamos escolher o nome da sua loja'}
        help="Toque no nome que você quer. Dá pra mudar depois."
        titleId={TITLE_ID}
        helpId={HELP_ID}
      />
      <FocusOnArrival targetId={TITLE_ID} />

      <BrandForm action={saveBrandName} editing={editing}>
        {usable || custom ? (
          <ChoiceButton
            name="name"
            value={custom ?? usable ?? ''}
            label={custom ?? usable}
            detail={custom ? 'O nome que você escreveu' : 'O nome que você escolheu na conversa'}
            selected={saved === (custom ?? usable)}
          />
        ) : null}
        <h2 className="mt-3 text-body font-semibold">
          {usable || custom ? 'Ou escolha uma das nossas ideias' : 'Nossas ideias pra você'}
        </h2>
        {ideas.map((idea) => (
          <ChoiceButton
            key={idea}
            name="name"
            value={idea}
            label={idea}
            selected={saved === idea}
          />
        ))}
      </BrandForm>

      <BrandForm action={saveBrandName} editing={editing} className="gap-4">
        <h2 className="text-body font-semibold">Prefere escrever outro nome?</h2>
        <OwnNameField
          initial={fromConversation && !usable ? fromConversation : (custom ?? '')}
          max={BRAND_NAME_MAX}
        />
      </BrandForm>
      {saved ? (
        <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <CheckIcon aria-hidden="true" className="size-4" />
          Nome salvo: {saved}
        </p>
      ) : null}
    </>
  );
}
