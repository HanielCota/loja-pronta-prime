'use client';

import { CheckIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** Orientação estimada pelo tempo de espera; o término depende da resposta da IA. */
const STAGES: [seconds: number, text: string][] = [
  [0, 'Lendo as suas escolhas'],
  [5, 'Desenhando o símbolo'],
  [13, 'Escrevendo o nome da loja'],
  [24, 'Caprichando nos detalhes'],
  [40, 'Quase pronto'],
];

/** Até onde a barra vai sozinha (nunca chega ao fim antes do logo chegar). */
const EXPECTED_SECONDS = 50;

/**
 * Criando o logo: a lista de etapas (a da vez girando, as passadas com o check), uma barra que
 * avança e o aviso de não fechar a página. O leitor de tela ouve só o título (não a cada etapa).
 */
export function CreatingProgress({ titleId, number }: { titleId: string; number: number }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const current = STAGES.findLastIndex(([from]) => seconds >= from);
  // Sobe rápido no começo e cada vez mais devagar (até 95%).
  const progress = Math.min(
    95,
    Math.round(100 * (1 - Math.exp(-seconds / (EXPECTED_SECONDS / 2.5)))),
  );
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <p className="text-body font-semibold text-link">Criando o logo {number}</p>
        <h1
          id={titleId}
          tabIndex={-1}
          className="text-title font-bold text-balance outline-none sm:text-title-lg"
        >
          A IA está desenhando o seu logo
        </h1>
        <p className="text-body text-pretty text-muted-foreground">
          Pode esperar aqui. Não feche esta página. A barra é uma estimativa; a criação termina
          quando o logo aparecer.
        </p>
      </div>
      <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-progress-track">
        {/* A barra cheia desliza (transform) em vez de crescer (width): anima por um a dois
            minutos sem recalcular o layout a cada quadro, e a ponta continua arredondada. */}
        <div
          className="h-full rounded-full bg-primary transition-transform duration-1000 ease-linear motion-reduce:transition-none"
          style={{ transform: `translateX(${progress - 100}%)` }}
        />
      </div>
      <ol aria-hidden="true" className="flex flex-col gap-3">
        {STAGES.map(([, text], index) => (
          <li
            key={text}
            className={cn(
              'flex items-center gap-3 text-body',
              index < current && 'text-foreground',
              index === current && 'font-semibold text-foreground',
              index > current && 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full border-2',
                index < current && 'border-progress bg-progress text-primary-foreground',
                index === current &&
                  'animate-spin border-primary border-t-transparent motion-reduce:animate-none',
                index > current && 'border-border',
              )}
            >
              {index < current ? <CheckIcon className="size-3.5" strokeWidth={3} /> : null}
            </span>
            {text}
          </li>
        ))}
      </ol>
    </div>
  );
}
