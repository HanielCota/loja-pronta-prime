'use client';

import { MicIcon, SquareIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MAX_OWN_TEXT } from '../model';
import { useSpeechInput } from './use-speech-input';

/**
 * Campo sempre visível para ela escrever (ou falar) outra ideia de desenho. O que ela escreve
 * vira a escolha da tela e vai como está pra IA desenhar.
 */
export function WriteOwn({
  placeholder,
  initial,
  disabled,
  speechAvailable,
  onUse,
}: {
  placeholder: string;
  /** O que ela já tinha escrito nesta tela. */
  initial: string;
  disabled: boolean;
  speechAvailable: boolean;
  onUse: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  const speech = useSpeechInput(setText);
  const speechReady = speechAvailable && speech.supported;
  const speechBusy = speech.status !== 'idle';
  const tooLong = text.length > MAX_OWN_TEXT;
  const fieldId = useId();
  const voiceId = useId();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!speechBusy && !tooLong && text.trim()) onUse(text.trim());
      }}
    >
      <label htmlFor={fieldId} className="text-body font-semibold">
        Escreva do seu jeito
      </label>
      <div className="flex items-center gap-2">
        <input
          id={fieldId}
          value={text}
          disabled={disabled || speechBusy}
          maxLength={MAX_OWN_TEXT}
          autoComplete="off"
          placeholder={placeholder}
          aria-describedby={voiceId}
          aria-invalid={tooLong}
          onChange={(event) => setText(event.target.value)}
          className={cn(
            'min-h-12 min-w-0 flex-1 rounded-full border bg-card px-5 text-body text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
            speech.status === 'recording' ? 'border-destructive' : 'border-input',
          )}
        />
        {speechReady ? (
          <button
            type="button"
            aria-pressed={speech.status === 'recording'}
            aria-label={
              speech.status === 'recording'
                ? 'Parar gravação e transcrever'
                : speech.status === 'starting'
                  ? 'Aguardando acesso ao microfone'
                  : speech.status === 'transcribing'
                    ? 'Transcrevendo fala'
                    : 'Falar em vez de escrever'
            }
            disabled={disabled || (speechBusy && speech.status !== 'recording')}
            onClick={() => (speech.status === 'recording' ? speech.stop() : speech.start(text))}
            className={cn(
              'grid size-12 shrink-0 place-items-center rounded-full transition-[background-color,transform] duration-100 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.94] disabled:opacity-50 motion-reduce:active:scale-100 forced-colors:border-2 forced-colors:border-[ButtonText]',
              speech.status === 'recording'
                ? 'animate-pulse bg-destructive text-white motion-reduce:animate-none'
                : 'bg-muted text-foreground hover:bg-foreground/10',
            )}
          >
            {speech.status === 'recording' ? (
              <SquareIcon aria-hidden="true" className="size-5 fill-current" />
            ) : (
              <MicIcon aria-hidden="true" className="size-6" />
            )}
          </button>
        ) : null}
        <Button
          type="submit"
          variant="default"
          className="w-auto px-5"
          disabled={disabled || speechBusy || tooLong || !text.trim()}
        >
          Usar essa ideia
        </Button>
      </div>
      {/* O que o microfone está fazendo (ou o problema dele), lido pelo leitor de tela. */}
      <p
        id={voiceId}
        aria-live="polite"
        className="text-sm text-pretty text-muted-foreground empty:hidden"
      >
        {speech.status === 'starting'
          ? 'Aguardando acesso ao microfone…'
          : speech.status === 'recording'
            ? 'Gravando… fale e toque no quadrado pra parar. A gravação para sozinha em 45 segundos.'
            : speech.status === 'transcribing'
              ? 'Transformando sua fala em texto…'
              : (speech.error ??
                (tooLong
                  ? `A fala ficou longa demais. Apague um pedaço até caber em ${MAX_OWN_TEXT} letras.`
                  : speechReady
                    ? 'Toque no microfone pra falar. O áudio vai para a OpenAI, que faz a transcrição. A plataforma não guarda a gravação.'
                    : speechAvailable
                      ? 'Falar em vez de escrever não funciona neste navegador. Você pode escrever no campo.'
                      : 'Falar em vez de escrever: em breve. Você pode escrever no campo.'))}
      </p>
    </form>
  );
}
