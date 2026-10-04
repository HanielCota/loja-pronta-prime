'use client';

import { Maximize2Icon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LOGO_TWEAK_IDS, LOGO_TWEAKS, type LogoTweak } from '../tweaks';
import { logoSrc } from './logo-src';

/**
 * As partes de um logo pronto, usadas no painel "Seu logo" (computador) e dentro da conversa
 * (celular): a imagem (tocar amplia), como fica no perfil da Shopee, o "Usar esse logo" e os
 * ajustes de um toque.
 */

/**
 * A imagem grande (tocar abre a janela, com o ícone de ampliar) e um quadro piscando enquanto chega.
 * Quem usa põe `key={imageId}`: trocando o logo, o "carregando" volta.
 */
export function LogoImage({
  imageId,
  number,
  onOpen,
  className,
}: {
  imageId: string;
  number: number;
  onOpen: (imageId: string) => void;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      type="button"
      title="Ver grande"
      onClick={() => onOpen(imageId)}
      className={cn(
        'relative w-full rounded-3xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring focus-visible:outline-solid',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc(imageId)}
        alt={`Logo ${number} criado pra sua loja`}
        width={400}
        height={400}
        onLoad={() => setLoaded(true)}
        className={cn(
          'aspect-square w-full rounded-3xl border border-border bg-card',
          !loaded && 'animate-pulse bg-muted motion-reduce:animate-none',
        )}
      />
      {/* Só o ícone, pequeno no canto: escrito, o selo cobria o nome no logo. Quem diz que abre
        grande é o "title" (e o leitor de tela ouve o nome do logo, que é o que abre). */}
      <span
        aria-hidden="true"
        className="absolute right-2.5 bottom-2.5 grid size-9 place-items-center rounded-full bg-black/55 text-white"
      >
        <Maximize2Icon className="size-4" />
      </span>
    </button>
  );
}

/** Como a cliente vai ver: a Shopee mostra o logo pequeno e redondo, com o nome do lado. */
export function ShopeePreview({ imageId, storeName }: { imageId: string; storeName: string }) {
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc(imageId)}
        alt=""
        width={48}
        height={48}
        className="size-12 shrink-0 rounded-full border border-border bg-card"
      />
      <p className="min-w-0 text-body text-pretty">
        <span className="font-semibold">{storeName}</span>
        <span className="block text-muted-foreground">Assim aparece no perfil da Shopee</span>
      </p>
    </div>
  );
}

export function ChooseButton({
  imageId,
  number,
  canChoose,
  choosing,
  onChoose,
  className,
}: {
  imageId: string;
  number: number;
  canChoose: boolean;
  /** Este logo está sendo salvo como o da loja. */
  choosing: boolean;
  onChoose: (imageId: string) => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      className={className}
      disabled={!canChoose && !choosing}
      loading={choosing}
      loadingText="Salvando…"
      onClick={() => onChoose(imageId)}
    >
      Usar esse logo<span className="sr-only"> (logo {number})</span>
    </Button>
  );
}

/** "Quer mudar algo?": cada botão cria a versão nova direto. */
export function TweakButtons({
  disabled,
  onTweak,
}: {
  disabled: boolean;
  onTweak: (tweak: LogoTweak) => void;
}) {
  return (
    <fieldset className="flex flex-col">
      <legend className="mb-2.5 text-body font-semibold">
        Quer mudar algo? Toque e eu faço outro:
      </legend>
      <div className="flex flex-wrap gap-2">
        {LOGO_TWEAK_IDS.map((tweak) => (
          <Button
            key={tweak}
            type="button"
            variant="soft"
            className="w-auto px-5"
            disabled={disabled}
            onClick={() => onTweak(tweak)}
          >
            {LOGO_TWEAKS[tweak].label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
