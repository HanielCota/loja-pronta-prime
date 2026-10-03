'use client';

import { ArrowRightIcon, CircleAlertIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LogoScene } from '../../logo/scene';
import { finishLogoEditor } from '../../server/actions';
import { BrandForm, useBrandPending } from '../brand-form';
import type { SaveState } from './logo-editor';

const STATUS: Record<SaveState, string> = {
  saved: 'Tudo salvo',
  saving: 'Salvando…',
  error: 'Não salvou. Confira a internet.',
};

/**
 * O botão principal, "Gostei, continuar" (um formulário de verdade, com a cena como está, que
 * segue pro próximo passo). O salvamento automático só aparece quando dá errado; o resto vai pro
 * leitor de tela.
 */
export function SaveBar({
  scene,
  variations,
  editing,
  saveState,
}: {
  scene: LogoScene;
  variations: LogoScene[];
  editing: boolean;
  saveState: SaveState;
}) {
  return (
    <BrandForm action={finishLogoEditor} editing={editing}>
      <input type="hidden" name="scene" value={JSON.stringify(scene)} />
      <input type="hidden" name="variations" value={JSON.stringify(variations)} />
      <output
        className={
          saveState === 'error'
            ? 'flex items-center justify-center gap-1.5 text-body font-semibold text-destructive'
            : 'sr-only'
        }
      >
        {saveState === 'error' ? (
          <CircleAlertIcon aria-hidden="true" className="size-5 shrink-0" />
        ) : null}
        {STATUS[saveState]}
      </output>
      <ContinueButton />
    </BrandForm>
  );
}

function ContinueButton() {
  const pending = useBrandPending();
  return (
    <Button type="submit" loading={pending} loadingText="Salvando…" className="min-h-14">
      Gostei, continuar
      {pending ? null : <ArrowRightIcon aria-hidden="true" />}
    </Button>
  );
}
