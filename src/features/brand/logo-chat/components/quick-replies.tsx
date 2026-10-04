'use client';

import { ShapesIcon, SparklesIcon, TypeIcon, type LucideIcon } from 'lucide-react';
import { colorsIn } from '../color-words';

/** Desenhos das respostas rápidas da primeira pergunta (as outras vêm da IA e mudam). */
const SUGGESTION_ICONS: Record<string, LucideIcon> = {
  'um desenho': ShapesIcon,
  'só o nome': TypeIcon,
  'me ajuda a escolher': SparklesIcon,
};

/**
 * As respostas da pergunta da vez, em botões grandes (dois por linha a partir do tablet), dentro
 * do cartão da pergunta: fica claro que respondem a ela. Quando falam de cor, mostram bolinhas
 * com as cores.
 */
export function QuickReplies({
  suggestions,
  disabled,
  onSend,
}: {
  suggestions: string[];
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-3 text-body text-muted-foreground">
        Toque numa resposta ou escreva a sua:
      </legend>
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          disabled={disabled}
          onClick={() => onSend(suggestion)}
          className="flex min-h-15 items-center gap-3 rounded-2xl border-2 border-input/40 bg-card px-5 py-3 text-left text-lg font-semibold text-foreground transition-[background-color,border-color,transform] duration-100 outline-none hover:border-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.98] disabled:opacity-50 motion-reduce:active:scale-100 sm:text-xl forced-colors:border-[ButtonText]"
        >
          <SuggestionVisual text={suggestion} />
          {suggestion}
        </button>
      ))}
    </fieldset>
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
