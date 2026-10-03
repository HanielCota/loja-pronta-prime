import { BRAND_DESCRIPTION_MAX } from '@/config/brand';
import type { OnboardingAnswers } from '@/config/onboarding';
import { FocusOnArrival } from '@/features/loja-pronta/components/focus-on-arrival';
import { MascotBubble } from '@/features/loja-pronta/components/mascot-bubble';
import { saveBrandDescription } from '../server/actions';
import { descriptionTones } from '../suggestions';
import { BrandForm } from './brand-form';
import { DescriptionPicker } from './description-picker';

const TITLE_ID = 'descricao-titulo';

/**
 * Passo 3: a descrição da loja (o texto do perfil dela na Shopee). Como no nome: um cartão que é
 * a prévia do perfil e o próprio campo, já com um texto pronto pra ela só ajustar; embaixo, os
 * jeitos de falar, que trocam o texto; e um botão só pra seguir.
 */
export function DescriptionStep({
  answers,
  storeName,
  logoSrc,
  saved,
  editing,
}: {
  answers: OnboardingAnswers;
  storeName: string;
  logoSrc: string | undefined;
  saved: string | null;
  editing: boolean;
}) {
  const tones = descriptionTones(answers, storeName);
  return (
    <>
      <MascotBubble compact title="Qual vai ser o texto da sua loja?" titleId={TITLE_ID} />
      <FocusOnArrival targetId={TITLE_ID} />
      <BrandForm action={saveBrandDescription} editing={editing}>
        <DescriptionPicker
          initial={saved ?? tones[0]?.texts[0] ?? ''}
          tones={tones}
          storeName={storeName}
          logoSrc={logoSrc}
          max={BRAND_DESCRIPTION_MAX}
        />
      </BrandForm>
    </>
  );
}
