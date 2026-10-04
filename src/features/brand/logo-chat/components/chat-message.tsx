'use client';

import { SparklesIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { mascotStill } from '@/components/brand/mascot/art';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BRAND_PATH } from '../../steps';
import type { ChatViewMessage } from '../chat-view';

/** O mascote, como "rosto" da assistente (só desenho: quem fala já vai escrito pro leitor). */
export function Avatar() {
  return <Image src={mascotStill} alt="" width={32} height={32} className="size-8 shrink-0" />;
}

/**
 * Uma mensagem da conversa: a dela, num balão à direita; a da assistente, solta ao lado do
 * mascote e, quando é um logo criado, com a imagem, a prévia no círculo da Shopee e os botões.
 */
export function ChatMessage({
  message,
  storeName,
  imageNumber,
  canChoose,
  choosing,
  canCreateMore,
  isLatestImage,
  onChoose,
  onAnother,
}: {
  message: ChatViewMessage;
  storeName: string;
  /** O número do logo (só nas mensagens com logo). */
  imageNumber: number | undefined;
  canChoose: boolean;
  /** Este logo está sendo salvo como o da loja. */
  choosing: boolean;
  canCreateMore: boolean;
  isLatestImage: boolean;
  onChoose: (imageId: string) => void;
  onAnother: () => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-3xl bg-card px-5 py-3 text-body text-pretty whitespace-pre-line text-foreground shadow-card forced-colors:border forced-colors:border-[CanvasText]">
          <span className="sr-only">Você disse: </span>
          {message.text}
        </p>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <Avatar />
      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-1">
        <p className="text-body leading-relaxed text-pretty whitespace-pre-line">
          <span className="sr-only">Assistente: </span>
          {message.text}
        </p>
        {message.imageId ? (
          <LogoResult
            imageId={message.imageId}
            storeName={storeName}
            number={imageNumber}
            canChoose={canChoose}
            choosing={choosing}
            showAnother={isLatestImage && canCreateMore}
            onChoose={onChoose}
            onAnother={onAnother}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Um logo criado: a imagem (com espera enquanto chega), como fica no perfil e os botões. */
function LogoResult({
  imageId,
  storeName,
  number,
  canChoose,
  choosing,
  showAnother,
  onChoose,
  onAnother,
}: {
  imageId: string;
  storeName: string;
  number: number | undefined;
  canChoose: boolean;
  choosing: boolean;
  showAnother: boolean;
  onChoose: (imageId: string) => void;
  onAnother: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const src = `${BRAND_PATH}/imagens/${imageId}`;
  return (
    <div className="flex flex-col gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Logo ${number ?? ''} criado pra sua loja`}
        width={320}
        height={320}
        onLoad={() => setLoaded(true)}
        className={cn(
          'aspect-square w-[min(320px,100%)] rounded-3xl border border-border bg-card',
          // Enquanto a imagem chega, um quadro piscando no lugar (sem piscar pra quem pediu menos
          // movimento).
          !loaded && 'animate-pulse bg-muted motion-reduce:animate-none',
        )}
      />
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
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="w-auto px-6"
          disabled={!canChoose && !choosing}
          loading={choosing}
          loadingText="Salvando…"
          onClick={() => onChoose(imageId)}
        >
          Usar esse logo<span className="sr-only"> (logo {number})</span>
        </Button>
        {showAnother ? (
          <Button type="button" variant="soft" className="w-auto px-6" onClick={onAnother}>
            <SparklesIcon aria-hidden="true" />
            Fazer outro
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** "Pensando…": a bolinha pulsando (como no ChatGPT) e o aviso escrito. */
export function Thinking() {
  return (
    <div className="flex gap-3">
      <Avatar />
      <p className="flex items-center gap-2.5 pt-1 text-body text-muted-foreground">
        <span
          aria-hidden="true"
          className="size-3 animate-pulse rounded-full bg-foreground motion-reduce:animate-none"
        />
        Pensando…
      </p>
    </div>
  );
}

/** Criando o logo: o quadro do logo piscando no lugar onde ele vai aparecer, e quanto demora. */
export function Creating() {
  return (
    <div className="flex gap-3">
      <Avatar />
      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-1">
        <p className="text-body text-muted-foreground">Criando seu logo… leva uns 15 segundos.</p>
        <div
          aria-hidden="true"
          className="grid aspect-square w-[min(320px,100%)] animate-pulse place-items-center rounded-3xl border border-border bg-muted motion-reduce:animate-none"
        >
          <SparklesIcon className="size-10 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
