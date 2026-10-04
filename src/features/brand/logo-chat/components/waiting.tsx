'use client';

import { SparklesIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar } from './chat-message';

/** "Pensando…": a bolinha pulsando (como no ChatGPT) e o aviso escrito. */
export function Thinking({ label = 'Pensando…' }: { label?: string }) {
  return (
    <div className="flex gap-3">
      <Avatar />
      <p className="flex items-center gap-2.5 pt-1.5 text-lg text-muted-foreground">
        <span
          aria-hidden="true"
          className="size-3 animate-pulse rounded-full bg-foreground motion-reduce:animate-none"
        />
        {label}
      </p>
    </div>
  );
}

/** As etapas da criação, pelo tempo que passou (a IA leva de 15 segundos a 1 minuto). */
const STAGES: [seconds: number, text: string][] = [
  [0, 'Pensando no desenho…'],
  [6, 'Desenhando…'],
  [14, 'Colorindo…'],
  [22, 'Escrevendo o nome da loja…'],
  [32, 'Caprichando nos detalhes…'],
  [45, 'Quase pronto…'],
];

/** Até onde a barra vai sozinha (nunca chega ao fim antes do logo chegar). */
const EXPECTED_SECONDS = 50;

/**
 * Criando o logo: a etapa da vez, uma barra que avança, o quadro piscando onde o logo vai
 * aparecer e o aviso de não fechar a página. O leitor de tela ouve o começo (o resto ele não
 * precisa ouvir a cada etapa).
 */
export function Creating({ label = 'Criando seu logo' }: { label?: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const stage = STAGES.findLast(([from]) => seconds >= from)?.[1] ?? STAGES[0]![1];
  // Sobe rápido no começo e cada vez mais devagar (até 95%).
  const progress = Math.min(
    95,
    Math.round(100 * (1 - Math.exp(-seconds / (EXPECTED_SECONDS / 2.5)))),
  );
  return (
    <div className="flex gap-3">
      <Avatar />
      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-1.5">
        <p className="text-lg font-semibold">
          {label}
          <span className="sr-only">. Leva até 1 minuto. Não feche esta página.</span>
        </p>
        <div aria-hidden="true" className="flex w-[min(360px,100%)] flex-col gap-2">
          <p className="text-lg text-muted-foreground">{stage}</p>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div
          aria-hidden="true"
          className="grid aspect-square w-[min(360px,100%)] animate-pulse place-items-center rounded-3xl border border-border bg-muted motion-reduce:animate-none"
        >
          <SparklesIcon className="size-10 text-muted-foreground" />
        </div>
        <p aria-hidden="true" className="text-body text-muted-foreground">
          Leva até 1 minuto. Não feche esta página.
        </p>
      </div>
    </div>
  );
}
