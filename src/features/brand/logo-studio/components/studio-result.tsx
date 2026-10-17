'use client';

import { CheckIcon, SlidersHorizontalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandKitPreview } from '@/features/brand/components/brand-kit-preview';
import { cn } from '@/lib/utils';
import { LOGO_TWEAK_IDS, LOGO_TWEAKS, type LogoTweak } from '../tweaks';
import type { StudioViewLogo } from '../view';
import { logoSrc } from './logo-src';

/**
 * O logo pronto (ele mesmo fica no quadro): como fica no perfil da loja e no kit de envio, os
 * logos que ela já tem, os ajustes de um toque e "Usar o logo".
 */
export function StudioResult({
  logos,
  selected,
  storeName,
  generationsLeft,
  titleId,
  busy,
  choosing,
  error,
  errorId,
  onSelect,
  onTweak,
  onChoose,
  onChangePicks,
}: {
  logos: StudioViewLogo[];
  selected: StudioViewLogo;
  storeName: string;
  generationsLeft: number;
  titleId: string;
  busy: boolean;
  /** O logo está sendo salvo como o da loja. */
  choosing: boolean;
  error: string | undefined;
  errorId: string;
  onSelect: (imageId: string) => void;
  onTweak: (tweak: LogoTweak) => void;
  onChoose: () => void;
  onChangePicks: () => void;
}) {
  const src = logoSrc(selected.imageId);
  const canTweak = selected.tweakable && generationsLeft > 0;
  const tweaks = LOGO_TWEAK_IDS.filter(
    (tweak) => !(selected.nameOnly && tweak === 'outro-desenho'),
  );
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <p className="text-body font-semibold text-link">
          {logos.length === 1 ? 'Ficou pronto' : `Logo ${selected.number} de ${logos.length}`}
        </p>
        <h1
          id={titleId}
          tabIndex={-1}
          className="text-title font-bold text-balance outline-none sm:text-title-lg"
        >
          Gostou? Veja como fica na sua loja
        </h1>
      </div>

      {/* A descrição serve quem usa leitor de tela; a foto e os logos sobrepostos são decorativos. */}
      <p className="sr-only">
        Prévia ilustrativa da loja: logo {selected.number} no perfil da loja e no kit de envio, com
        caixa, adesivo e sacola.
      </p>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-3xl bg-card p-3 shadow-card forced-colors:border forced-colors:border-[CanvasText]">
          <span className="text-sm text-muted-foreground">Prévia ilustrativa da loja</span>
          <div className="flex items-center gap-3 rounded-2xl bg-muted p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              width={56}
              height={56}
              className="size-14 shrink-0 rounded-full border border-border bg-card object-contain"
            />
            <span className="min-w-0 truncate text-body font-bold">{storeName}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-3xl bg-card p-3 shadow-card forced-colors:border forced-colors:border-[CanvasText]">
          <span className="text-body font-bold">Kit de envio</span>
          <BrandKitPreview logoSrc={src} />
          <span className="text-center text-sm text-muted-foreground">Caixa, adesivo e sacola</span>
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-body font-bold">Seus logos ({logos.length})</legend>
        <div className="flex flex-wrap gap-2.5">
          {logos.map((logo) => {
            const active = logo.imageId === selected.imageId;
            return (
              <button
                key={logo.imageId}
                type="button"
                aria-pressed={active}
                disabled={busy}
                onClick={() => onSelect(logo.imageId)}
                className={cn(
                  'flex w-20 flex-col items-center gap-1 rounded-2xl border-2 bg-card p-1 pb-1.5 text-sm shadow-card outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:opacity-60',
                  active
                    ? 'border-primary font-bold text-foreground forced-colors:border-[Highlight]'
                    : 'border-transparent text-muted-foreground hover:border-border',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc(logo.imageId)}
                  alt=""
                  width={72}
                  height={72}
                  className="aspect-square w-full rounded-xl border border-border bg-card"
                />
                Logo {logo.number}
              </button>
            );
          })}
          {/* Os lugares que ainda dá pra criar (só desenho). */}
          {Array.from({ length: generationsLeft }, (_, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="w-20 rounded-2xl border-2 border-dashed border-border p-1"
            >
              <span className="block aspect-square" />
            </span>
          ))}
        </div>
        <p className="text-body text-pretty text-muted-foreground">
          {generationsLeft
            ? `Você ainda pode criar ${generationsLeft} ${generationsLeft === 1 ? 'logo' : 'logos'}.`
            : 'Você já criou todos os logos que dava.'}
        </p>
      </fieldset>

      {canTweak ? (
        <fieldset className="flex flex-col">
          <legend className="mb-3 text-body font-bold">
            Quer mudar algo? Um toque cria outra versão
          </legend>
          <div className="flex flex-wrap gap-2">
            {tweaks.map((tweak) => (
              <Button
                key={tweak}
                type="button"
                variant="default"
                className="w-auto px-5"
                disabled={busy}
                onClick={() => onTweak(tweak)}
              >
                {LOGO_TWEAKS[tweak].label}
              </Button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <p
        id={errorId}
        role="alert"
        className="rounded-2xl bg-destructive-soft px-4 py-3 text-body text-pretty text-destructive empty:hidden forced-colors:border forced-colors:border-[CanvasText]"
      >
        {error}
      </p>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          disabled={busy && !choosing}
          loading={choosing}
          loadingText="Salvando…"
          onClick={onChoose}
        >
          <CheckIcon aria-hidden="true" />
          Usar o logo {selected.number}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-link"
          disabled={busy}
          onClick={onChangePicks}
        >
          <SlidersHorizontalIcon aria-hidden="true" />
          Mudar as escolhas
        </Button>
      </div>
    </div>
  );
}
