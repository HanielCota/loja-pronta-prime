import { PencilIcon } from 'lucide-react';
import { useId } from 'react';
import type { TopicAnswer } from '../chat-view';
import { LOGO_TOPICS } from '../model';

/**
 * "Suas respostas": o que ela já respondeu, uma etiqueta por assunto ("Cores: rosa"). Tocar numa
 * pede pra assistente mudar aquela resposta (ela pergunta de novo). Some sem respostas.
 */
export function AnswersBar({
  answers,
  disabled,
  onChange,
}: {
  answers: TopicAnswer[];
  disabled: boolean;
  /** O pedido de mudança vai como mensagem dela ("Quero mudar as cores"). */
  onChange: (request: string) => void;
}) {
  const titleId = useId();
  if (!answers.length) return null;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2.5">
      <h2 id={titleId} className="text-body font-semibold text-muted-foreground">
        Suas respostas
      </h2>
      <ul className="flex flex-wrap gap-2">
        {answers.map((answer) => (
          <li key={answer.topic} className="max-w-full">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(LOGO_TOPICS[answer.topic].change)}
              className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-input/50 bg-card px-4 text-body text-foreground transition-[border-color,transform] duration-100 outline-none hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.97] disabled:opacity-50 motion-reduce:active:scale-100 forced-colors:border-[ButtonText]"
            >
              <span className="shrink-0 font-semibold">{answer.label}:</span>
              <span className="max-w-60 truncate">{answer.answer}</span>
              <PencilIcon aria-hidden="true" className="size-4 shrink-0 text-link" />
              <span className="sr-only">(toque pra mudar)</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
