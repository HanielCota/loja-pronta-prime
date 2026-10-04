'use client';

import { cn } from '@/lib/utils';
import type { LogoTweak } from '../tweaks';
import type { ChatLogo } from './logo-gallery';
import { ChooseButton, LogoImage, ShopeePreview, TweakButtons } from './logo-result';
import { logoSrc } from './logo-src';

/**
 * O logo pronto, no meio da tela (no lugar da pergunta): ele em tamanho grande, como fica na
 * Shopee, "Usar esse logo", os ajustes de um toque e a troca entre os logos que ela já criou.
 */
export function LogoPanel({
  logos,
  selected,
  storeName,
  generationsLeft,
  canTweak,
  canChoose,
  choosing,
  onSelect,
  onOpen,
  onChoose,
  onTweak,
}: {
  logos: ChatLogo[];
  selected: ChatLogo;
  storeName: string;
  generationsLeft: number;
  /** A conversa tem o resumo e ainda dá pra criar (os ajustes redesenham pela IA). */
  canTweak: boolean;
  canChoose: boolean;
  /** O logo que está sendo salvo como o da loja. */
  choosing: string | undefined;
  onSelect: (imageId: string) => void;
  onOpen: (imageId: string) => void;
  onChoose: (imageId: string) => void;
  onTweak: (tweak: LogoTweak) => void;
}) {
  return (
    <section
      aria-labelledby="painel-logo"
      className="flex flex-col gap-5 rounded-card bg-card p-5 shadow-card sm:p-8 forced-colors:border forced-colors:border-[CanvasText]"
    >
      <h2 id="painel-logo" className="text-xl font-semibold">
        Logo {selected.number}
      </h2>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Do tamanho que cabe na altura da tela, pra os botões ficarem à vista. */}
        <LogoImage
          // Outro logo, outro componente: o "carregando" recomeça (o estado fica no LogoImage).
          key={selected.imageId}
          imageId={selected.imageId}
          number={selected.number}
          onOpen={onOpen}
          className="mx-auto max-w-[min(100%,40dvh)] sm:mx-0 sm:max-w-72"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <ShopeePreview imageId={selected.imageId} storeName={storeName} />
          <ChooseButton
            imageId={selected.imageId}
            number={selected.number}
            canChoose={canChoose}
            choosing={choosing === selected.imageId}
            onChoose={onChoose}
          />
          {canTweak && !selected.uploaded ? (
            <TweakButtons disabled={!canChoose} onTweak={onTweak} />
          ) : null}
        </div>
      </div>

      {logos.length >= 2 ? (
        <fieldset className="flex flex-col gap-3 border-t border-border pt-5">
          <legend className="sr-only">Seus logos ({logos.length})</legend>
          <p aria-hidden="true" className="text-body font-semibold">
            Seus logos ({logos.length}): toque pra comparar
          </p>
          <div className="flex flex-wrap gap-2.5">
            {logos.map((logo) => {
              const active = logo.imageId === selected.imageId;
              return (
                <button
                  key={logo.imageId}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Logo ${logo.number}`}
                  onClick={() => onSelect(logo.imageId)}
                  className={cn(
                    'rounded-2xl border-2 p-0.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
                    active ? 'border-primary' : 'border-transparent hover:border-border',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoSrc(logo.imageId)}
                    alt=""
                    width={72}
                    height={72}
                    className="size-18 rounded-xl border border-border bg-card"
                  />
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <p className="text-body text-muted-foreground">
        {generationsLeft
          ? `Você ainda pode criar ${generationsLeft} ${generationsLeft === 1 ? 'logo' : 'logos'}.`
          : 'Você já criou todos os logos que dava.'}
      </p>
    </section>
  );
}
