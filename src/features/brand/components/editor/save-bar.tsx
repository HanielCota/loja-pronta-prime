'use client';

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CircleAlertIcon } from 'lucide-react';
import Link from 'next/link';
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
 * Embaixo do editor: voltar pro Modo fácil, se está tudo salvo e "Salvar e continuar" (um
 * formulário de verdade, com a cena como está, que segue pro próximo passo).
 */
export function SaveBar({
  scene,
  editing,
  easyHref,
  saveState,
}: {
  scene: LogoScene;
  editing: boolean;
  easyHref: string;
  saveState: SaveState;
}) {
  const status = STATUS[saveState];
  const Icon = status.icon;
  return (
    // Presa embaixo da tela: o "Salvar e continuar" está sempre à vista, qualquer que seja a altura.
    <BrandForm action={finishLogoEditor} editing={editing} className="sticky bottom-3 z-20">
      <input type="hidden" name="scene" value={JSON.stringify(scene)} />
      <div className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-card/95 p-3 shadow-card backdrop-blur-md">
        <Button asChild variant="ghost" size="inline" className="px-3 text-foreground">
          <Link href={easyHref}>
            <ArrowLeftIcon aria-hidden="true" className="size-5" />
            Modo fácil
          </Link>
        </Button>
        <output
          className={
            saveState === 'error'
              ? 'flex items-center gap-1.5 text-sm font-semibold text-destructive'
              : 'flex items-center gap-1.5 text-sm text-muted-foreground'
          }
        >
          {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
          {status.text}
        </output>
        <span className="flex-1" />
        <ContinueButton />
      </div>
    </BrandForm>
  );
}

function ContinueButton() {
  const pending = useBrandPending();
  return (
    <Button type="submit" loading={pending} loadingText="Salvando…" className="w-auto px-8">
      Salvar e continuar
      {pending ? null : <ArrowRightIcon aria-hidden="true" />}
    </Button>
  );
}
