'use client';

import { CheckIcon, SlidersHorizontalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LOGO_TWEAK_IDS, LOGO_TWEAKS, type LogoTweak } from '../tweaks';
import type { StudioViewLogo } from '../view';
import { logoSrc } from './logo-src';

/**
 * O logo pronto (ele mesmo fica no quadro): como fica na loja (no perfil da Shopee, na
 * embalagem e pequenininho), os logos que ela já tem, os ajustes de um toque e "Usar o logo".
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

      {/* As prévias são só enfeite pro leitor de tela: a frase diz o que mostram. */}
      <p className="sr-only">
        Prévias do logo {selected.number} no perfil da Shopee, numa sacola e em tamanhos pequenos.
      </p>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-2 rounded-3xl bg-card p-3 shadow-card forced-colors:border forced-colors:border-[CanvasText]">
          <div className="overflow-hidden rounded-2xl bg-muted">
            <div className="h-12 bg-primary-soft" />
            <div className="-mt-6 flex items-end gap-3 px-3 pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                width={64}
                height={64}
                className="size-16 shrink-0 rounded-full border-4 border-card bg-card"
              />
              <span className="flex min-w-0 flex-col pb-1">
                <span className="truncate text-body font-bold">{storeName}</span>
                <span className="text-sm text-muted-foreground">Loja nova · 0 vendas</span>
              </span>
            </div>
          </div>
          <span className="text-center text-sm text-muted-foreground">No perfil da Shopee</span>
        </div>

        <div className="flex flex-col gap-2 rounded-3xl bg-card p-3 shadow-card forced-colors:border forced-colors:border-[CanvasText]">
          {/* A sacola kraft (foto, fundo transparente) com o logo impresso na frente: "multiplicar"
              some com o branco do logo e deixa a textura do papel aparecer, como tinta no papel.
              A posição é a da face da sacola na foto. */}
          <div className="relative mx-auto aspect-[400/665] w-full max-w-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/sacola-kraft.webp"
              alt=""
              width={400}
              height={665}
              className="size-full"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              width={64}
              height={64}
              className="absolute top-[40%] left-1/2 w-[64%] -translate-x-1/2 opacity-90 mix-blend-multiply"
            />
          </div>
          <span className="text-center text-sm text-muted-foreground">Na embalagem</span>
        </div>

        <div className="flex flex-col gap-2 rounded-3xl bg-card p-3 shadow-card forced-colors:border forced-colors:border-[CanvasText]">
          <div className="flex flex-1 items-end justify-center gap-3 pb-1">
            {[56, 36, 24].map((size) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={size}
                src={src}
                alt=""
                width={size}
                height={size}
                style={{ width: size, height: size }}
                className="rounded-[22%] border border-border bg-card"
              />
            ))}
          </div>
          <span className="text-center text-sm text-muted-foreground">Pequenininho</span>
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
                variant="soft"
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
