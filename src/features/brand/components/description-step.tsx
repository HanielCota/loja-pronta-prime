import { BRAND_DESCRIPTION_MAX } from '@/config/brand';
import type { OnboardingAnswers } from '@/config/onboarding';
import { FocusOnArrival } from '@/features/loja-pronta/components/focus-on-arrival';
import { MascotBubble } from '@/features/loja-pronta/components/mascot-bubble';
import { saveBrandDescription } from '../server/actions';
import { descriptionSuggestions } from '../suggestions';
import { BrandForm, ChoiceButton } from './brand-form';
import { OwnDescriptionField } from './own-description-field';

const TITLE_ID = 'descricao-titulo';

/**
 * Passo 4: a descrição da loja (o texto que aparece no perfil dela na Shopee). Três textos
 * prontos, cada um um botão; embaixo, o campo pra escrever o dela (já com o salvo, se for dela).
 */
export function DescriptionStep({
  answers,
  storeName,
  saved,
  editing,
}: {
  answers: OnboardingAnswers;
  storeName: string;
  saved: string | null;
  editing: boolean;
}) {
  const options = descriptionSuggestions(answers, storeName);
  const custom = saved && !options.includes(saved) ? saved : '';
  return (
    <>
      <MascotBubble
        title="Escolha o texto da sua loja"
        help="É o que as clientes leem no perfil da loja na Shopee. Toque no que mais gostar."
        titleId={TITLE_ID}
      />
      <FocusOnArrival targetId={TITLE_ID} />
      <BrandForm action={saveBrandDescription} editing={editing}>
        {options.map((option, index) => (
          <ChoiceButton
            key={option}
            name="description"
            value={option}
            label={option}
            detail={`Texto ${index + 1}`}
            selected={saved === option}
            className="font-normal"
          />
        ))}
      </BrandForm>
      <BrandForm action={saveBrandDescription} editing={editing} className="gap-4">
        <h2 className="text-body font-semibold">Prefere escrever o seu?</h2>
        <OwnDescriptionField initial={custom} max={BRAND_DESCRIPTION_MAX} />
      </BrandForm>
    </>
  );
}
