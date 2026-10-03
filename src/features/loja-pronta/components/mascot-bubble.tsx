import { Mascot } from '@/components/brand/mascot';

type MascotBubbleProps = {
  /** A pergunta: é o título da página. */
  title: string;
  help?: string | undefined;
  /** Ids do título e da ajuda, pro formulário apontar pra eles (nome e descrição do grupo). */
  titleId: string;
  helpId?: string | undefined;
};

/**
 * A pergunta em destaque: o mascote "fazendo" a pergunta, grande e centralizado, e ela em letra
 * grande logo abaixo. Uma pergunta por tela, como numa conversa, sem a mecânica de um chat
 * (mensagens que chegam aos poucos, difíceis de voltar e de acompanhar com leitor de tela).
 */
export function MascotBubble({ title, help, titleId, helpId }: MascotBubbleProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Mascot expression="happy" displaySize={128} className="size-20 sm:size-24 lg:size-32" />
      <div className="flex flex-col gap-2">
        {/* tabIndex -1: recebe o foco ao chegar na etapa (FocusOnArrival), sem entrar no Tab. */}
        <h1
          id={titleId}
          tabIndex={-1}
          className="text-title font-semibold text-balance outline-none sm:text-title-lg lg:text-title-xl"
        >
          {title}
        </h1>
        {help ? (
          <p id={helpId} className="text-body text-pretty text-muted-foreground">
            {help}
          </p>
        ) : null}
      </div>
    </div>
  );
}
