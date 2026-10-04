'use client';

import { MoonIcon, SunIcon, XIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChatLogo } from './logo-gallery';
import { logoSrc } from './logo-src';
import { useDialog } from './use-dialog';

/**
 * Um logo em tamanho grande, pra ver os detalhes: dá pra ver no fundo claro e no escuro (como
 * fica no celular de cada cliente) e já usar dali. Janela nativa: Esc fecha, o foco volta.
 */
export function LogoViewer({
  logo,
  canChoose,
  onChoose,
  onClose,
}: {
  logo: ChatLogo | null;
  canChoose: boolean;
  onChoose: (imageId: string) => void;
  onClose: () => void;
}) {
  const ref = useDialog(Boolean(logo));
  const titleId = useId();
  const [dark, setDark] = useState(false);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(640px,calc(100vw-32px))] overflow-y-auto rounded-card border border-border bg-card p-5 text-foreground shadow-card backdrop:bg-black/70 sm:p-6"
    >
      {logo ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-xl font-semibold">
              Logo {logo.number}
            </h2>
            <Button type="button" variant="ghost" size="inline" className="px-3" onClick={onClose}>
              <XIcon aria-hidden="true" />
              Fechar
            </Button>
          </div>
          <div
            className={cn(
              'grid place-items-center rounded-3xl p-4 transition-colors duration-200 motion-reduce:transition-none sm:p-8',
              dark ? 'bg-[#1c1c1e]' : 'bg-[#f5f5f7]',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc(logo.imageId)}
              alt={`Logo ${logo.number} criado pra sua loja, em tamanho grande`}
              width={560}
              height={560}
              className="aspect-square w-full max-w-[560px] rounded-2xl"
            />
          </div>
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Cor do fundo</legend>
            {[
              { value: false, label: 'Fundo claro', Icon: SunIcon },
              { value: true, label: 'Fundo escuro', Icon: MoonIcon },
            ].map(({ value, label, Icon }) => (
              <label
                key={label}
                className={cn(
                  'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-body font-medium has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid',
                  dark === value
                    ? 'border-link bg-link/10 text-link'
                    : 'border-input bg-card text-foreground',
                )}
              >
                <input
                  type="radio"
                  name="fundo"
                  className="sr-only"
                  checked={dark === value}
                  onChange={() => setDark(value)}
                />
                <Icon aria-hidden="true" className="size-5" />
                {label}
              </label>
            ))}
          </fieldset>
          <Button
            type="button"
            disabled={!canChoose}
            onClick={() => {
              onChoose(logo.imageId);
              onClose();
            }}
          >
            Usar esse logo<span className="sr-only"> (logo {logo.number})</span>
          </Button>
        </div>
      ) : null}
    </dialog>
  );
}
