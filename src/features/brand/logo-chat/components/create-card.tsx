import { SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatView } from '../chat-view';

/**
 * "Tudo pronto pra criar": o resumo do logo (pra ela conferir o que entendemos), quantas
 * criações restam e o botão. Depois de um logo, vira "Criar outro logo".
 */
export function CreateCard({
  summary,
  generationsLeft,
  again,
  busy,
  onCreate,
}: {
  summary: ChatView['summary'];
  generationsLeft: number;
  /** Já criou um logo nesta conversa. */
  again: boolean;
  busy: boolean;
  onCreate: () => void;
}) {
  return (
    <section
      aria-labelledby="criar-titulo"
      className="flex flex-col gap-5 rounded-card bg-card p-5 shadow-card sm:p-8 forced-colors:border forced-colors:border-[CanvasText]"
    >
      <h2 id="criar-titulo" className="text-xl font-semibold sm:text-2xl">
        {again ? 'Pronto pra criar outro logo' : 'Tudo pronto pra criar o seu logo'}
      </h2>
      {summary.length ? (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 text-lg">
          {summary.map((item) => (
            <div key={item.label} className="contents">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="text-pretty">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="text-body text-pretty text-muted-foreground">
        {generationsLeft
          ? `Você pode criar mais ${generationsLeft} ${generationsLeft === 1 ? 'logo' : 'logos'}. Quer mudar algo? É só escrever.`
          : 'Você já criou todos os logos que dava. Escolha um deles em "Seus logos".'}
      </p>
      <Button
        type="button"
        className="sm:w-auto sm:self-start sm:px-8"
        disabled={busy || generationsLeft === 0}
        onClick={onCreate}
      >
        <SparklesIcon aria-hidden="true" />
        {again ? 'Criar outro logo' : 'Criar meu logo'}
      </Button>
    </section>
  );
}
