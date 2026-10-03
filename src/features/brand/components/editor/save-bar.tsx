'use client';

import { ArrowRightIcon, CheckIcon, CircleAlertIcon, EyeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LogoScene } from '../../logo/scene';
import { finishLogoEditor } from '../../server/actions';
import { BrandForm, useBrandPending } from '../brand-form';
import type { SaveState } from './logo-editor';

const STATUS: Record<SaveState, { text: string; icon: typeof CheckIcon | null }> = {
  saved: { text: 'Tudo salvo', icon: CheckIcon },
  saving: { text: 'Salvando…', icon: null },
  error: { text: 'Não salvou. Confira a internet.', icon: CircleAlertIcon },
};

/**
 * Embaixo do editor: se está tudo salvo, "Pré-visualizar" e "Salvar e continuar" (um
 * formulário de verdade, com a cena como está, que segue pro próximo passo).
 */
export function SaveBar({
  scene,
  variations,
  editing,
  saveState,
  onPreview,
}: {
  scene: LogoScene;
  variations: LogoScene[];
  editing: boolean;
  saveState: SaveState;
  onPreview: () => void;
}) {
  const status = STATUS[saveState];
  const Icon = status.icon;
  return (
    // Presa embaixo da tela: o "Salvar e continuar" está sempre à vista, qualquer que seja a altura.
    <BrandForm action={finishLogoEditor} editing={editing} className="sticky bottom-3 z-20">
      <input type="hidden" name="scene" value={JSON.stringify(scene)} />
      <input type="hidden" name="variations" value={JSON.stringify(variations)} />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-card border border-border bg-card/95 p-3 shadow-card backdrop-blur-md sm:gap-x-4">
        <output
          className={
            // No celular, numa linha só com os botões: o status fica pro leitor de tela, e o erro
            // desce pra uma linha própria (esse tem que aparecer).
            saveState === 'error'
              ? 'flex items-center gap-1.5 text-sm font-semibold text-destructive max-sm:order-last max-sm:w-full'
              : 'flex items-center gap-1.5 text-sm text-muted-foreground max-sm:sr-only'
          }
        >
          {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
          {status.text}
        </output>
        <span className="flex-1 max-sm:hidden" />
        {/* No celular, só o olho (o nome continua pro leitor de tela). */}
        <Button type="button" variant="soft" onClick={onPreview} className="w-auto px-4 sm:px-6">
          <EyeIcon aria-hidden="true" />
          <span className="max-sm:sr-only">Pré-visualizar</span>
        </Button>
        <ContinueButton />
      </div>
    </BrandForm>
  );
}

function ContinueButton() {
  const pending = useBrandPending();
  return (
    <Button
      type="submit"
      loading={pending}
      loadingText="Salvando…"
      className="w-auto px-8 max-sm:flex-1 max-sm:px-4"
    >
      Salvar e continuar
      {pending ? null : <ArrowRightIcon aria-hidden="true" />}
    </Button>
  );
}
