import {
  ArrowRightIcon,
  BookmarkIcon,
  CheckIcon,
  ClockIcon,
  ListChecksIcon,
  MessageCircleIcon,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { STORE_PHASES } from '@/config/store-phases';
import { TEAM_WHATSAPP } from '@/config/support';
import { CONVERSATION_PATH, QUESTION_COUNT } from '../steps';
import type { ConversationStatus } from '../store-phase';
import { whatsappLink } from '../whatsapp';
import { cn } from '@/lib/utils';
import { firstName } from '@/features/products/names';
import {
  AreaShell,
  sectionTitleClass,
  greeting,
  panelCard,
} from '@/features/member/components/area-shell';

type StorePanelProps = {
  user: { name: string };
  firstVisit: boolean;
  /** Tem os dois produtos: o topo leva de volta pra escolha. */
  hasChoice: boolean;
  phase: number;
  conversation: ConversationStatus;
};

/**
 * Painel da Loja Pronta: onde a loja está (no topo, com a barra das 7 fases), o que fazer agora
 * (o cartão principal) e a jornada inteira ao lado. Sem cartão em volta, como a escolha de área:
 * a loja é o assunto, não a saudação. No celular, a ação vem antes da jornada.
 */
export function StorePanel({ user, firstVisit, hasChoice, phase, conversation }: StorePanelProps) {
  const total = STORE_PHASES.length;
  const name = firstName(user.name);

  return (
    <AreaShell
      hasChoice={hasChoice}
      product="Loja Pronta"
      title={`Sua loja está na fase ${phase} de ${total}`}
      intro={greeting(
        name,
        firstVisit,
        firstVisit
          ? 'A equipe monta sua loja na Shopee, e você acompanha cada fase aqui.'
          : 'Aqui você acompanha cada fase da sua loja.',
      )}
    >
      {/* A barra é o desenho do que está escrito no título e logo abaixo dela. */}
      <div className="flex flex-col gap-2.5">
        <div aria-hidden="true" className="flex gap-1.5">
          {STORE_PHASES.map((step, index) => (
            <span
              key={step.title}
              className={cn(
                'h-2 flex-1 rounded-full border border-transparent',
                index < phase
                  ? 'bg-primary forced-colors:bg-[CanvasText]'
                  : 'bg-track forced-colors:border-[CanvasText]',
              )}
            />
          ))}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <NextStepCard phase={phase} conversation={conversation} />
        <JourneyCard phase={phase} />
      </div>
    </AreaShell>
  );
}

/** O que fazer agora (ou, quando a vez é da equipe, o que ela está fazendo). */
function NextStepCard({
  phase,
  conversation,
}: {
  phase: number;
  conversation: ConversationStatus;
}) {
  const current = STORE_PHASES[phase - 1];

  if (phase === 1 && conversation !== 'enviada') {
    return (
      <ActionCard label="O que fazer agora" title="Conte sobre você e sua marca">
        <p className="text-body text-pretty text-foreground/80">
          São perguntas rápidas, uma por vez. Com suas respostas, a equipe cria o logo e a descrição
          da loja.
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-body text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <ClockIcon aria-hidden="true" className="size-4" />5 minutos
          </li>
          <li className="inline-flex items-center gap-1.5">
            <ListChecksIcon aria-hidden="true" className="size-4" />
            {QUESTION_COUNT} perguntas
          </li>
          <li className="inline-flex items-center gap-1.5">
            <BookmarkIcon aria-hidden="true" className="size-4" />
            Você pode parar e continuar depois
          </li>
        </ul>
        <Button asChild className="mt-2">
          <Link href={CONVERSATION_PATH}>
            {conversation === 'em-andamento' ? 'Continuar a conversa' : 'Começar a conversa'}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </ActionCard>
    );
  }

  // Conversa enviada (a página já mostra a fase 2 nesse caso): a equipe está criando a marca.
  if (phase === 2 && conversation === 'enviada') {
    return (
      <ActionCard label="Com a equipe" title="Estamos criando sua marca">
        <p className="text-body text-pretty text-foreground/80">
          A equipe está criando opções de logo e de descrição pra sua loja. Em até 24 horas, você
          recebe um aviso no WhatsApp pra escolher.
        </p>
        <TalkToTeam />
      </ActionCard>
    );
  }

  // As outras fases ainda não têm telas: o que acontece agora, e quem avisa quando for a vez dela.
  return (
    <ActionCard label="O que acontece agora" title={current?.title ?? ''}>
      <p className="text-body text-pretty text-foreground/80">{current?.detail}</p>
      <p className="text-body text-pretty text-muted-foreground">
        Quando precisar de você, a equipe chama no WhatsApp.
      </p>
      <TalkToTeam />
    </ActionCard>
  );
}

/**
 * Enquanto a loja está com a equipe, a tela não pede nada dela: este é o caminho pra tirar uma
 * dúvida. Só aparece com o número da equipe configurado (config/support.ts).
 */
function TalkToTeam() {
  if (!TEAM_WHATSAPP) return null;
  return (
    <Button asChild variant="soft" className="mt-2">
      <a
        href={whatsappLink(TEAM_WHATSAPP, 'Oi! Sou aluna da Loja Pronta e tenho uma dúvida.')}
        target="_blank"
        rel="noreferrer"
      >
        <MessageCircleIcon aria-hidden="true" />
        Chamar no WhatsApp
        <span className="sr-only"> (abre em outra aba)</span>
      </a>
    </Button>
  );
}

function ActionCard({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="o-que-fazer" className={cn(panelCard, 'gap-3')}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <h2 id="o-que-fazer" className="text-2xl font-semibold tracking-tight text-balance">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** As 7 fases: as concluídas marcadas, a atual em destaque e as próximas esmaecidas. */
function JourneyCard({ phase }: { phase: number }) {
  return (
    <section aria-labelledby="sua-jornada" className={cn(panelCard, 'gap-4')}>
      <h2 id="sua-jornada" className={sectionTitleClass}>
        Sua jornada
      </h2>
      <ol aria-label="Todas as fases da sua loja" className="flex flex-col gap-1">
        {STORE_PHASES.map((step, index) => {
          const number = index + 1;
          const done = number < phase;
          const isCurrent = number === phase;
          return (
            <li
              key={step.title}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                '-mx-3 flex items-center gap-3 rounded-2xl px-3 py-2',
                isCurrent &&
                  'bg-primary-soft forced-colors:border forced-colors:border-[Highlight]',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold',
                  (done || isCurrent) && 'bg-primary text-primary-foreground',
                  !done && !isCurrent && 'bg-muted text-muted-foreground ring-1 ring-border',
                )}
              >
                {done ? <CheckIcon className="size-4" /> : number}
              </span>
              <span
                className={cn(
                  'flex-1 text-body',
                  isCurrent && 'font-semibold',
                  !done && !isCurrent && 'text-muted-foreground',
                )}
              >
                {step.title}
                <span className="sr-only">
                  {/* A atual já é anunciada pelo aria-current ("etapa atual"). */}
                  {done ? ' (concluída)' : isCurrent ? '' : ' (a seguir)'}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
