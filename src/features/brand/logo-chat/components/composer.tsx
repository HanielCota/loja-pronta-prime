'use client';

import { ArrowUpIcon } from 'lucide-react';
import { useId, type RefObject } from 'react';
import { cn } from '@/lib/utils';
import { MAX_MESSAGE_CHARS } from '../model';

/**
 * A caixa de escrever (como a do ChatGPT): grande, arredondada, com o enviar dentro, e as
 * respostas rápidas logo acima. Enter manda; Shift+Enter pula linha.
 */
export function Composer({
  draft,
  onDraftChange,
  onSend,
  suggestions,
  disabled,
  describedBy,
  fieldRef,
  className,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (text: string) => void;
  suggestions: string[];
  disabled: boolean;
  /** O aviso de erro, quando tem (o leitor de tela lê junto do campo). */
  describedBy: string | undefined;
  fieldRef: RefObject<HTMLTextAreaElement | null>;
  className?: string | undefined;
}) {
  const fieldId = useId();
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {suggestions.length ? (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Respostas rápidas</legend>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSend(suggestion)}
              className="min-h-11 rounded-full border border-input bg-card px-4 text-body font-medium text-foreground shadow-sm transition-[background-color,transform] duration-100 outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.97] motion-reduce:active:scale-100 forced-colors:border-[ButtonText]"
            >
              {suggestion}
            </button>
          ))}
        </fieldset>
      ) : null}

      <form
        className="flex items-end gap-2 rounded-[28px] border border-input bg-card py-2 pr-2 pl-5 shadow-card transition-colors duration-150 focus-within:border-primary motion-reduce:transition-none forced-colors:border-[CanvasText]"
        onSubmit={(event) => {
          event.preventDefault();
          onSend(draft);
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
          placeholder="Escreva sobre o seu logo…"
          aria-describedby={describedBy}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSend(draft);
            }
          }}
          className="[field-sizing:content] max-h-48 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-body leading-normal text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label="Enviar"
          disabled={!draft.trim() || disabled}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground text-background transition-[opacity,transform] duration-100 outline-none hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.94] disabled:bg-muted disabled:text-muted-foreground motion-reduce:active:scale-100 forced-colors:border-2 forced-colors:border-[ButtonText]"
        >
          <ArrowUpIcon aria-hidden="true" className="size-5" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
