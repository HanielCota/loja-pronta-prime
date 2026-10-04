'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { QuickReplies } from './quick-replies';
import { Thinking } from './waiting';

/**
 * A pergunta da vez, num cartão no meio da tela: "Pergunta 2 de 5" (com a barrinha), a pergunta
 * em letra grande e as respostas em botões grandes. Esperando a assistente, os botões dão lugar
 * ao "Pensando…". A fala fica num role=log: o leitor de tela anuncia cada pergunta nova.
 */
export function QuestionCard({
  text,
  step,
  total,
  animate,
  waiting,
  suggestions,
  disabled,
  onSend,
}: {
  text: string;
  /** Em que pergunta está (sem assunto, como uma dúvida, não mostra a contagem). */
  step: number | null;
  total: number;
  /** Pergunta nova: aparece aos poucos, palavra por palavra. */
  animate: boolean;
  /** O aviso de espera no lugar das respostas ("Pensando…"), quando está esperando. */
  waiting: string | null;
  suggestions: string[];
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  return (
    <section
      aria-label="Pergunta da assistente"
      className="flex flex-col gap-6 rounded-card bg-card p-5 shadow-card sm:p-8 forced-colors:border forced-colors:border-[CanvasText]"
    >
      {step ? (
        <div className="flex flex-col gap-2">
          <p className="text-body font-semibold text-link">
            Pergunta {step} de {total}
          </p>
          {/* A contagem já está escrita; a barrinha é só o desenho dela. */}
          <div aria-hidden="true" className="flex gap-1.5">
            {Array.from({ length: total }, (_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  index < step ? 'bg-primary forced-colors:bg-[CanvasText]' : 'bg-muted',
                )}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div role="log" aria-label="Conversa sobre o seu logo">
        <p className="text-xl leading-snug font-semibold text-pretty whitespace-pre-line sm:text-2xl">
          <span className="sr-only">Assistente: </span>
          {/* A chave recomeça a animação a cada pergunta nova. */}
          {animate ? <Typewriter key={text} text={text} /> : text}
        </p>
      </div>

      {waiting ? (
        <Thinking label={waiting} />
      ) : suggestions.length ? (
        <QuickReplies suggestions={suggestions} disabled={disabled} onSend={onSend} />
      ) : null}
    </section>
  );
}

/**
 * A fala aparecendo palavra por palavra, como no ChatGPT (a espera parece menor). O leitor de
 * tela recebe o texto inteiro de uma vez; quem pediu menos movimento vê tudo direto.
 */
export function Typewriter({ text }: { text: string }) {
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
