'use client';

import { Maximize2Icon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { mascotStill } from '@/components/brand/mascot/art';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChatViewMessage } from '../chat-view';
import { LOGO_TWEAK_IDS, LOGO_TWEAKS, type LogoTweak } from '../tweaks';
import { logoSrc } from './logo-src';

/** O mascote, como "rosto" da assistente (só desenho: quem fala já vai escrito pro leitor). */
export function Avatar() {
  return <Image src={mascotStill} alt="" width={40} height={40} className="size-10 shrink-0" />;
}

/**
 * Uma mensagem da conversa: a dela, num balão à direita; a da assistente, solta ao lado do
 * mascote e, quando é um logo, com a imagem (tocar amplia), a prévia no círculo da Shopee e os
 * botões.
 */
export function ChatMessage({
  message,
  storeName,
  imageNumber,
  animate,
  canChoose,
  choosing,
  tweaks,
  onChoose,
  onOpen,
  onTweak,
}: {
  message: ChatViewMessage;
  storeName: string;
  /** O número do logo (só nas mensagens com logo). */
  imageNumber: number | undefined;
  /** Fala nova: aparece aos poucos, palavra por palavra. */
  animate: boolean;
  canChoose: boolean;
  /** Este logo está sendo salvo como o da loja. */
  choosing: boolean;
  /** Mostra os ajustes de um toque (só no último logo criado pela IA, com criações sobrando). */
  tweaks: boolean;
  onChoose: (imageId: string) => void;
  onOpen: (imageId: string) => void;
  onTweak: (tweak: LogoTweak) => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-3xl bg-card px-5 py-3 text-lg text-pretty whitespace-pre-line text-foreground shadow-card forced-colors:border forced-colors:border-[CanvasText]">
          <span className="sr-only">Você disse: </span>
          {message.text}
        </p>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <Avatar />
      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-1.5">
        <p className="text-lg leading-relaxed text-pretty whitespace-pre-line">
          <span className="sr-only">Assistente: </span>
          {animate ? <Typewriter text={message.text} /> : message.text}
        </p>
        {message.imageId ? (
          <LogoResult
            imageId={message.imageId}
            storeName={storeName}
            number={imageNumber}
            canChoose={canChoose}
            choosing={choosing}
            tweaks={tweaks}
            onChoose={onChoose}
            onOpen={onOpen}
            onTweak={onTweak}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * A fala aparecendo palavra por palavra, como no ChatGPT (a espera parece menor). O leitor de
 * tela recebe o texto inteiro de uma vez; quem pediu menos movimento vê tudo direto.
 */
function Typewriter({ text }: { text: string }) {
  const words = text.split(/(\s+)/);
  const [shown, setShown] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? words.length : 0,
  );
  useEffect(() => {
    if (shown >= words.length) return;
    const timer = window.setTimeout(() => setShown((count) => count + 2), 28);
    return () => window.clearTimeout(timer);
  }, [shown, words.length]);
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{words.slice(0, shown).join('')}</span>
    </>
  );
}

/** Um logo: a imagem (tocar amplia), como fica no perfil, o "Usar esse logo" e os ajustes. */
function LogoResult({
  imageId,
  storeName,
  number,
  canChoose,
  choosing,
  tweaks,
  onChoose,
  onOpen,
  onTweak,
}: {
  imageId: string;
  storeName: string;
  number: number | undefined;
  canChoose: boolean;
  choosing: boolean;
  tweaks: boolean;
  onChoose: (imageId: string) => void;
  onOpen: (imageId: string) => void;
  onTweak: (tweak: LogoTweak) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const src = logoSrc(imageId);
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => onOpen(imageId)}
        className="relative w-[min(360px,100%)] rounded-3xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring focus-visible:outline-solid"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`Logo ${number ?? ''} criado pra sua loja`}
          width={360}
          height={360}
          onLoad={() => setLoaded(true)}
          className={cn(
            'aspect-square w-full rounded-3xl border border-border bg-card',
            // Enquanto a imagem chega, um quadro piscando no lugar.
            !loaded && 'animate-pulse bg-muted motion-reduce:animate-none',
          )}
        />
        <span
          aria-hidden="true"
          className="absolute right-3 bottom-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-black/70 px-3.5 text-body font-medium text-white"
        >
          <Maximize2Icon className="size-4" />
          Ver grande
        </span>
      </button>
      {/* Como a cliente vai ver: a Shopee mostra o logo pequeno e redondo, com o nome do lado. */}
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
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
      <Button
        type="button"
        className="sm:w-auto sm:self-start sm:px-8"
        disabled={!canChoose && !choosing}
        loading={choosing}
        loadingText="Salvando…"
        onClick={() => onChoose(imageId)}
      >
        Usar esse logo<span className="sr-only"> (logo {number})</span>
      </Button>
      {tweaks ? (
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
                disabled={!canChoose}
                onClick={() => onTweak(tweak)}
              >
                {LOGO_TWEAKS[tweak].label}
              </Button>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
