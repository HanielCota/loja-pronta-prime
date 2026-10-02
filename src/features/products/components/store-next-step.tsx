import { ArrowRightIcon, ClockIcon, ListChecksIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { QUESTION_COUNT, CONVERSATION_PATH } from '@/features/onboarding/steps';

export type ConversationStatus = 'nao-comecou' | 'em-andamento' | 'enviada';

/**
 * O que fazer agora na Loja Pronta, acima das fases: na fase 1, a conversa inicial (com o botão
 * pra começar ou continuar); depois de enviada, que a vez é da equipe. Nas outras fases, nada:
 * as telas delas ainda não existem, e a lista de fases já diz onde a loja está.
 */
export function StoreNextStep({
  phase,
  conversation,
}: {
  phase: number;
  conversation: ConversationStatus;
}) {
  if (phase === 1 && conversation !== 'enviada') {
    return (
      <section
        aria-labelledby="o-que-fazer"
        className="flex flex-col gap-4 rounded-3xl bg-primary-soft p-5 sm:p-6 forced-colors:border forced-colors:border-[CanvasText]"
      >
        <div className="flex flex-col gap-1.5">
          <h2 id="o-que-fazer" className="text-xl font-semibold tracking-tight">
            O que fazer agora
          </h2>
          <p className="text-body text-pretty text-foreground/80">
            Uma conversa rápida pra gente te conhecer e entender como você imagina a sua marca. Com
            ela, a equipe cria o logo e a descrição da sua loja.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-body text-foreground/80">
          <li className="inline-flex items-center gap-1.5">
            <ClockIcon aria-hidden="true" className="size-4" />5 minutos
          </li>
          <li className="inline-flex items-center gap-1.5">
            <ListChecksIcon aria-hidden="true" className="size-4" />
            {QUESTION_COUNT} perguntas
          </li>
          <li>Dá pra parar e continuar depois</li>
        </ul>
        <Button asChild>
          <Link href={CONVERSATION_PATH}>
            {conversation === 'em-andamento' ? 'Continuar a conversa' : 'Começar a conversa'}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </section>
    );
  }

  // Na fase 1 também: a equipe pode ter voltado a loja pra fase 1 depois do envio (a conversa
  // não reabre sozinha), e a área não pode ficar sem dizer o que está acontecendo.
  if (phase <= 2 && conversation === 'enviada') {
    return (
      <section
        aria-labelledby="o-que-fazer"
        className="flex flex-col gap-2 rounded-3xl bg-muted p-5 sm:p-6 forced-colors:border forced-colors:border-[CanvasText]"
      >
        <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Com a nossa equipe
        </p>
        <h2 id="o-que-fazer" className="text-xl font-semibold tracking-tight">
          Estamos criando a sua marca
        </h2>
        <p className="text-body text-pretty text-foreground/80">
          A equipe está criando opções de logo e de descrição pra sua loja. Te avisamos no WhatsApp
          em até 24 horas pra você escolher.
        </p>
      </section>
    );
  }

  return null;
}
