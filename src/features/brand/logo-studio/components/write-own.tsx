'use client';

import { MicIcon, PenLineIcon, SquareIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MAX_OWN_TEXT } from '../model';
import { useSpeechInput } from './use-speech-input';

/**
 * "Não achei o que queria": um campo pra ela escrever (ou falar) do jeito dela. O que ela
 * escreve vira a escolha da tela e vai como está pra IA desenhar.
 */
export function WriteOwn({
  placeholder,
  initial,
  disabled,
  onUse,
}: {
  placeholder: string;
  /** O que ela já tinha escrito nesta tela. */
  initial: string;
  disabled: boolean;
  onUse: (text: string) => void;
}) {
  const [open, setOpen] = useState(Boolean(initial));
  const [text, setText] = useState(initial);
  const speech = useSpeechInput(setText);
  const fieldId = useId();
  const fieldRef = useRef<HTMLInputElement>(null);
  /** Ela tocou pra abrir: o cursor vai pro campo (abrindo com o texto de antes, não). */
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (opened) fieldRef.current?.focus();
  }, [opened]);
  const voiceId = useId();

  if (!open) {
    return (
      <Button
        type="button"
        variant="link"
        size="inline"
        className="self-start text-body font-semibold whitespace-normal"
        disabled={disabled}
        onClick={() => {
          setOpen(true);
          setOpened(true);
        }}
      >
        <PenLineIcon aria-hidden="true" />
        Não achei o que queria. Escrever do meu jeito
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (speech.listening) speech.stop();
        if (text.trim()) onUse(text.trim());
      }}
    >
      <label htmlFor={fieldId} className="text-body font-semibold">
        Escreva do seu jeito
      </label>
      <div className="flex items-center gap-2">
        <input
          id={fieldId}
          ref={fieldRef}
          value={text}
          maxLength={MAX_OWN_TEXT}
          autoComplete="off"
          placeholder={speech.listening ? 'Pode falar…' : placeholder}
          aria-describedby={voiceId}
          onChange={(event) => setText(event.target.value)}
          className={cn(
            'min-h-12 min-w-0 flex-1 rounded-full border bg-card px-5 text-body text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
            speech.listening ? 'border-destructive' : 'border-input',
          )}
        />
        {speech.supported ? (
          <button
            type="button"
            aria-pressed={speech.listening}
            aria-label={speech.listening ? 'Parar de ouvir' : 'Falar em vez de escrever'}
            disabled={disabled}
            onClick={() => (speech.listening ? speech.stop() : speech.start(text))}
            className={cn(
              'grid size-12 shrink-0 place-items-center rounded-full transition-[background-color,transform] duration-100 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.94] disabled:opacity-50 motion-reduce:active:scale-100 forced-colors:border-2 forced-colors:border-[ButtonText]',
              speech.listening
                ? 'animate-pulse bg-destructive text-white motion-reduce:animate-none'
                : 'bg-muted text-foreground hover:bg-foreground/10',
            )}
          >
            {speech.listening ? (
              <SquareIcon aria-hidden="true" className="size-5 fill-current" />
            ) : (
              <MicIcon aria-hidden="true" className="size-6" />
            )}
          </button>
        ) : null}
        <Button type="submit" variant="soft" className="w-auto px-5" disabled={disabled}>
          Usar
        </Button>
      </div>
      {/* O que o microfone está fazendo (ou o problema dele), lido pelo leitor de tela. */}
      <p
        id={voiceId}
        aria-live="polite"
        className="text-sm text-pretty text-muted-foreground empty:hidden"
      >
        {speech.listening
          ? 'Ouvindo… fale e o texto aparece no campo. Toque no quadrado pra parar.'
          : (speech.error ?? null)}
      </p>
    </form>
  );
}
