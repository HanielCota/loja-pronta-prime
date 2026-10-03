import type { OnboardingAnswers } from '@/config/onboarding';
import { FocusOnArrival } from '@/features/loja-pronta/components/focus-on-arrival';
import { MascotBubble } from '@/features/loja-pronta/components/mascot-bubble';
import { LOGO_LAYOUTS, logoTemplates, type LogoConfig } from '../logo/config';
import { chooseLogoTemplate } from '../server/actions';
import { logoPreviewSrc } from '../logo-preview';
import { BrandForm, ChoiceButton } from './brand-form';

const TITLE_ID = 'modelo-titulo';

/**
 * Passo 2: os 6 modelos prontos, já com o nome, a letra, a cor e o ícone dela. Tocar num modelo
 * escolhe e leva pro estúdio, onde ela muda o que quiser.
 */
export function TemplateStep({
  answers,
  saved,
  editing,
}: {
  answers: OnboardingAnswers;
  saved: LogoConfig | null;
  editing: boolean;
}) {
  return (
    <>
      <MascotBubble
        title="Qual desses logos você mais gosta?"
        help="Toque em um. Depois você muda a cor, o desenho e a letra."
        titleId={TITLE_ID}
      />
      <FocusOnArrival targetId={TITLE_ID} />
      <BrandForm action={chooseLogoTemplate} editing={editing}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {logoTemplates(answers).map((template) => {
            const layout = LOGO_LAYOUTS.find((item) => item.id === template.layout);
            return (
              <ChoiceButton
                key={template.template}
                name="template"
                value={String(template.template)}
                label={layout?.label ?? `Modelo ${template.template + 1}`}
                selected={saved?.template === template.template}
                media={
                  // O nome do modelo já está no botão: a imagem é só o desenho.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreviewSrc(template)}
                    alt=""
                    width={240}
                    height={240}
                    className="aspect-square w-full rounded-xl border border-border"
                  />
                }
              />
            );
          })}
        </div>
      </BrandForm>
    </>
  );
}
