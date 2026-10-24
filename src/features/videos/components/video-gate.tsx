'use client';

import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

/** Pulo maior que isso entre duas leituras do tempo é avanço na barra (não conta como assistido). */
const MAX_STEP_SECONDS = 1.5;

/**
 * O vídeo, com o "Continuar" liberado depois de ela assistir uma parte (`minWatch`, de 0 a 1).
 * Conta só o que tocou de verdade: avançar a barra não vale. "Pular o vídeo" fica sempre ali,
 * pra quem não pode ver agora. O leitor de tela ouve só quando libera (não a cada segundo).
 */
export function VideoGate({
  src,
  captions,
  title,
  minWatch,
  next,
}: {
  src: string;
  /** A legenda (WebVTT), quando enviada: aparece ligada. */
  captions: string | undefined;
  /** O nome do vídeo (o leitor de tela ouve ao chegar nele). */
  title: string;
  minWatch: number;
  /** Pra onde o "Continuar" e o "Pular o vídeo" levam. */
  next: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  /** Até onde ela assistiu sem pular, e onde estava na última leitura. */
  const watched = useRef({ until: 0, last: 0 });
  const [fraction, setFraction] = useState(0);
  const [ended, setEnded] = useState(false);
  const [nudge, setNudge] = useState(false);
  const statusId = useId();

  const ready = ended || fraction >= minWatch;
  const missing = Math.max(1, Math.ceil((minWatch - fraction) * 100));

  function track() {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const now = video.currentTime;
    const state = watched.current;
    if (now - state.last <= MAX_STEP_SECONDS && now > state.until) state.until = now;
    state.last = now;
    setFraction(state.until / video.duration);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* A legenda vem junto quando foi enviada (o <track> abaixo); a regra não enxerga o "se". */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={src}
        title={title}
        controls
        playsInline
        preload="metadata"
        onTimeUpdate={track}
        onSeeked={() => {
          // Depois de mexer na barra, conta a partir de onde ela parou.
          if (videoRef.current) watched.current.last = videoRef.current.currentTime;
        }}
        onEnded={() => setEnded(true)}
        className="aspect-video w-full rounded-3xl shadow-card"
      >
        {captions ? (
          <track kind="captions" src={captions} srcLang="pt-BR" label="Português" default />
        ) : null}
      </video>

      <div className="flex flex-col gap-2">
        <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-progress-track">
          {/* Desliza (transform) em vez de crescer (width): o vídeo atualiza a barra várias vezes
              por segundo, e assim o navegador não recalcula o layout a cada vez. */}
          <div
            className="h-full rounded-full bg-progress transition-transform duration-500 motion-reduce:transition-none"
            style={{
              transform: `translateX(${(ready ? 1 : Math.min(1, fraction / minWatch)) * 100 - 100}%)`,
            }}
          />
        </div>
        <p
          id={statusId}
          className={
            nudge && !ready
              ? 'text-body font-semibold text-pretty text-foreground'
              : 'text-body text-pretty text-muted-foreground'
          }
        >
          {ready ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-progress-text">
              <CheckIcon aria-hidden="true" className="size-5" />
              Pronto! Pode continuar.
            </span>
          ) : (
            `Assista mais um pouco pra continuar: faltam ${missing}%.`
          )}
        </p>
        {/* Só o "pronto" é anunciado (a porcentagem muda a cada segundo). */}
        <p aria-live="polite" className="sr-only">
          {ready ? 'Pronto! O botão Continuar foi liberado.' : ''}
        </p>
      </div>

      {ready ? (
        <Button asChild>
          <Link href={next}>
            Continuar
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button
          type="button"
          aria-disabled="true"
          aria-describedby={statusId}
          onClick={() => {
            setNudge(true);
            videoRef.current?.focus();
          }}
        >
          Continuar
          <ArrowRightIcon aria-hidden="true" />
        </Button>
      )}
      <Button asChild variant="ghost" className="text-link">
        <Link href={next}>Pular o vídeo</Link>
      </Button>
    </div>
  );
}
