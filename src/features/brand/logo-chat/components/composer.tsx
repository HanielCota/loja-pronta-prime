'use client';

import {
  ArrowUpIcon,
  ImageUpIcon,
  MicIcon,
  PenLineIcon,
  ShapesIcon,
  SparklesIcon,
  SquareIcon,
  TypeIcon,
  type LucideIcon,
} from 'lucide-react';
import { useId, useRef, type RefObject } from 'react';
import { cn } from '@/lib/utils';
import { colorsIn } from '../color-words';
import { MAX_MESSAGE_CHARS } from '../model';
import { useSpeechInput } from './use-speech-input';

/** Desenhos das respostas rápidas da primeira pergunta (as outras vêm da IA e mudam). */
const SUGGESTION_ICONS: Record<string, LucideIcon> = {
  'um desenho': ShapesIcon,
  'só o nome': TypeIcon,
  'me ajuda a escolher': SparklesIcon,
};

/**
 * A caixa de escrever (como a do ChatGPT): grande, arredondada, com o microfone e o enviar
 * dentro; as respostas rápidas em cima (com bolinhas das cores, quando falam de cor) e, embaixo,
 * "Já tenho um logo". Enter manda; Shift+Enter pula linha.
 */
export function Composer({
  draft,
  onDraftChange,
  onSend,
  onUpload,
  suggestions,
  disabled,
  describedBy,
  fieldRef,
  className,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (text: string) => void;
  /** Ela escolheu a imagem do próprio logo. */
  onUpload: (file: File) => void;
  suggestions: string[];
  disabled: boolean;
  /** O aviso de erro, quando tem (o leitor de tela lê junto do campo). */
  describedBy: string | undefined;
  fieldRef: RefObject<HTMLTextAreaElement | null>;
  className?: string | undefined;
}) {
  const fieldId = useId();
  const voiceId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const speech = useSpeechInput(onDraftChange);

  function send(text: string) {
    if (speech.listening) speech.stop();
    onSend(text);
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {suggestions.length ? (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Respostas rápidas</legend>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={disabled}
              onClick={() => send(suggestion)}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-input bg-card px-5 text-lg font-medium text-foreground shadow-sm transition-[background-color,transform] duration-100 outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.97] motion-reduce:active:scale-100 forced-colors:border-[ButtonText]"
            >
              <SuggestionVisual text={suggestion} />
              {suggestion}
            </button>
          ))}
        </fieldset>
      ) : null}

      <form
        className={cn(
          'flex items-end gap-1.5 rounded-[32px] border bg-card py-2.5 pr-2.5 pl-6 shadow-card transition-colors duration-150 focus-within:border-primary motion-reduce:transition-none forced-colors:border-[CanvasText]',
          speech.listening ? 'border-destructive' : 'border-input',
        )}
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <label htmlFor={fieldId} className="sr-only">
          Sua mensagem
        </label>
        <textarea
          ref={fieldRef}
          id={fieldId}
          rows={1}
          value={draft}
          maxLength={MAX_MESSAGE_CHARS}
          placeholder={speech.listening ? 'Pode falar…' : 'Escreva ou fale sobre o seu logo…'}
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

      <div>
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
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-body font-medium text-link transition-colors duration-100 outline-none hover:bg-link/10 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid disabled:opacity-50"
        >
          <ImageUpIcon aria-hidden="true" className="size-5" />
          Já tenho um logo
        </button>
      </div>
    </div>
  );
}

/** As bolinhas das cores que a resposta cita, ou o desenho dela (só enfeite: o texto já diz). */
function SuggestionVisual({ text }: { text: string }) {
  const colors = colorsIn(text);
  if (colors.length) {
    return (
      <span aria-hidden="true" className="flex -space-x-1.5">
        {colors.map((color) => (
          <span
            key={color}
            className="size-5 rounded-full border-2 border-card shadow-[0_0_0_1px_rgb(0_0_0/0.15)]"
            style={{ backgroundColor: color }}
          />
        ))}
      </span>
    );
  }
  const Icon = SUGGESTION_ICONS[text.trim().toLowerCase()];
  return Icon ? <Icon aria-hidden="true" className="size-5 text-primary" /> : null;
}
