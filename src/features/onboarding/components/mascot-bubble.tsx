import { Mascot } from '@/components/brand/mascot';

type MascotBubbleProps = {
  /** A pergunta: é o título da página. */
  title: string;
  help?: string;
  /** Ids do título e da ajuda, pro formulário apontar pra eles (nome e descrição do grupo). */
  titleId?: string;
  helpId?: string;
};

/**
 * O mascote "fazendo a pergunta": o calor de uma conversa, sem a mecânica de um chat (mensagens
 * que chegam aos poucos, difíceis de voltar e de acompanhar com leitor de tela).
 */
export function MascotBubble({ title, help, titleId, helpId }: MascotBubbleProps) {
  return (
    <div className="flex items-end gap-2.5">
      <Mascot expression="happy" displaySize={64} className="size-14 shrink-0 sm:size-16" />
      <div className="flex-1 rounded-[22px] rounded-bl-md bg-card px-5 py-4 shadow-sm forced-colors:border forced-colors:border-[CanvasText]">
        <h1
          id={titleId}
          className="text-xl leading-tight font-semibold tracking-tight text-balance sm:text-2xl"
        >
          {title}
        </h1>
        {help ? (
          <p id={helpId} className="mt-1.5 text-body text-pretty text-muted-foreground">
            {help}
          </p>
        ) : null}
      </div>
    </div>
  );
}
