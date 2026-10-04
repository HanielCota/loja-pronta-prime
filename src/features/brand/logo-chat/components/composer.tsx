'use client';

import { ArrowUpIcon, ImageUpIcon, MicIcon, PenLineIcon, SquareIcon } from 'lucide-react';
import { useEffect, useId, useRef, type RefObject } from 'react';
import { cn } from '@/lib/utils';
import { MAX_MESSAGE_CHARS } from '../model';
import { useSpeechInput } from './use-speech-input';

/**
 * A caixa de escrever (como a do ChatGPT): grande, arredondada, com o microfone e o enviar
 * dentro (e, à esquerda, "Já tenho um logo"). Enter manda; Shift+Enter pula linha. As respostas
 * rápidas ficam embaixo da pergunta, na conversa (QuickReplies).
 */
export function Composer({
  draft,
  onDraftChange,
  onSend,
  onUpload,
  disabled,
  describedBy,
  fieldRef,
  footnote,
  className,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (text: string) => void;
  /** Ela escolheu a imagem do próprio logo (sem ele, nada de "Já tenho um logo"). */
  onUpload: ((file: File) => void) | undefined;
  disabled: boolean;
  /** O aviso de erro, quando tem (o leitor de tela lê junto do campo). */
  describedBy: string | undefined;
  fieldRef: RefObject<HTMLTextAreaElement | null>;
  /** O aviso miúdo embaixo da caixa (como o "pode cometer erros" do ChatGPT). */
  footnote?: string | undefined;
  className?: string | undefined;
}) {
  const fieldId = useId();
  const voiceId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const speech = useSpeechInput(onDraftChange);
  const { listening, stop } = speech;

  // Mandou (pela caixa ou por uma resposta rápida): o microfone para de ouvir.
  useEffect(() => {
    if (disabled && listening) stop();
  }, [disabled, listening, stop]);

  function send(text: string) {
    if (speech.listening) speech.stop();
    onSend(text);
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <form
        className={cn(
          'flex items-end gap-1.5 rounded-[32px] border bg-card py-2.5 pr-2.5 shadow-card transition-colors duration-150 focus-within:border-primary motion-reduce:transition-none forced-colors:border-[CanvasText]',
          speech.listening ? 'border-destructive' : 'border-input',
          onUpload ? 'pl-2.5' : 'pl-6',
        )}
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        {/* "Já tenho um logo": dentro da caixa, à esquerda (como o anexar do ChatGPT). O nome
          aparece ao passar o mouse e vai pro leitor de tela. */}
        {onUpload ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) onUpload(file);
              }}
            />
            <button
              type="button"
              aria-label="Já tenho um logo"
              title="Já tenho um logo"
              disabled={disabled}
              onClick={() => fileRef.current?.click()}
              className="grid size-12 shrink-0 place-items-center rounded-full text-link transition-[background-color,transform] duration-100 outline-none hover:bg-link/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.94] disabled:opacity-50 motion-reduce:active:scale-100 forced-colors:border-2 forced-colors:border-[ButtonText]"
            >
              <ImageUpIcon aria-hidden="true" className="size-6" />
            </button>
          </>
        ) : null}
        <label htmlFor={fieldId} className="sr-only">
          Sua mensagem
        </label>
        <textarea
          ref={fieldRef}
          id={fieldId}
          rows={1}
          value={draft}
          maxLength={MAX_MESSAGE_CHARS}
          placeholder={speech.listening ? 'Pode falar…' : 'Escreva ou fale…'}
          aria-describedby={cn(describedBy, voiceId) || undefined}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send(draft);
            }
          }}
          className="[field-sizing:content] max-h-48 min-h-12 flex-1 resize-none bg-transparent py-3 text-lg leading-normal text-foreground outline-none placeholder:text-muted-foreground"
        />
        {speech.supported ? (
          <button
            type="button"
            aria-pressed={speech.listening}
            aria-label={speech.listening ? 'Parar de ouvir' : 'Falar em vez de escrever'}
            disabled={disabled}
            onClick={() => (speech.listening ? speech.stop() : speech.start(draft))}
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
        <button
          type="submit"
          aria-label="Enviar"
          disabled={!draft.trim() || disabled}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground text-background transition-[opacity,transform] duration-100 outline-none hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.94] disabled:bg-muted disabled:text-muted-foreground motion-reduce:active:scale-100 forced-colors:border-2 forced-colors:border-[ButtonText]"
        >
          <ArrowUpIcon aria-hidden="true" className="size-6" strokeWidth={2.5} />
        </button>
      </form>

      {/* O que o microfone está fazendo (ou o problema dele), lido pelo leitor de tela. */}
      <p
        id={voiceId}
        aria-live="polite"
        className="flex items-center gap-2 text-body text-muted-foreground empty:hidden"
      >
        {speech.listening ? (
          <>
            <PenLineIcon aria-hidden="true" className="size-5 shrink-0" />
            Ouvindo… fale e o texto aparece aqui. Toque no quadrado pra parar.
          </>
        ) : (
          (speech.error ?? null)
        )}
      </p>
      {footnote ? (
        <p className="text-center text-sm text-pretty text-muted-foreground">{footnote}</p>
      ) : null}
    </div>
  );
}
