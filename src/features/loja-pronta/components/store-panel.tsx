import { ArrowRightIcon, BellIcon, CheckIcon, MessageCircleIcon } from 'lucide-react';
import Link from 'next/link';
import { Mascot } from '@/components/brand/mascot';
import { Button } from '@/components/ui/button';
import { STORE_PHASES, STORE_STAGES } from '@/config/store-phases';
import { TEAM_WHATSAPP } from '@/config/support';
import type { LogoConfig } from '@/features/brand/logo/config';
import { logoPreviewSrc } from '@/features/brand/logo-preview';
import { BRAND_PATH } from '@/features/brand/steps';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { firstName } from '@/features/products/names';
import { cn } from '@/lib/utils';
import { storeStages, type StageView } from '../stages';
import { CONVERSATION_PATH } from '../steps';
import type { ConversationStatus } from '../store-phase';
import { whatsappLink } from '../whatsapp';

type StorePanelProps = {
  user: { name: string; email: string };
  /** Tem os dois produtos: o topo leva de volta pra escolha. */
  hasChoice: boolean;
  phase: number;
  conversation: ConversationStatus;
  /** A marca, quando já tem: o nome vira o título e o logo aparece no destaque. */
  brand: { name: string | null; logo: LogoConfig | null; started: boolean };
};

/**
 * Painel da Loja Pronta: um título pessoal, um destaque com a única coisa a fazer agora e, embaixo,
 * o caminho em 3 etapas (as 7 fases agrupadas com as palavras dela). Uma decisão e um mapa
 * simples, em vez de várias listas contando a mesma jornada. No celular, o caminho fica na
 * vertical. Com a marca pronta, o título é o nome da loja.
 */
export function StorePanel({ user, hasChoice, phase, conversation, brand }: StorePanelProps) {
  const name = firstName(user.name);
  return (
    <AreaShell
      account={user}
      hasChoice={hasChoice}
      crumb="Loja Pronta"
      title={
        brand.name ?? (name ? `Oi, ${name}! Vamos montar sua loja?` : 'Vamos montar sua loja?')
      }
      intro={brand.name ? 'Sua loja na Shopee' : undefined}
    >
      <NextStep phase={phase} conversation={conversation} brand={brand} />
      <Path stages={storeStages(phase)} />
    </AreaShell>
  );
}

type Hero = {
  eyebrow: string;
  title: string;
  text: string;
  action?: { href: string; label: string } | undefined;
  /** Linha menor ao lado do botão (ou no lugar dele). */
  note: string;
};

/** "Etapa 2 de 3 · Uns 10 minutos": o destaque diz em que pedaço do caminho ela está. */
function stageEyebrow(stage: number, rest: string): string {
  return `Etapa ${stage} de ${STORE_STAGES.length} · ${rest}`;
}

/** O que o destaque diz em cada momento da loja. */
function heroFor(phase: number, conversation: ConversationStatus, brandStarted: boolean): Hero {
  if (phase === 1 && conversation !== 'enviada') {
    return {
      eyebrow: stageEyebrow(1, 'Uns 5 minutos'),
      title: 'Conte sobre você e sua marca',
      text: 'Umas perguntas rápidas, uma por vez. Com elas, já preparamos ideias de nome, logo e texto pra sua loja.',
      action: {
        href: CONVERSATION_PATH,
        label: conversation === 'em-andamento' ? 'Continuar a conversa' : 'Começar a conversa',
      },
      note: 'Dá pra parar e continuar depois.',
    };
  }
  if (phase <= 2) {
    return {
      eyebrow: stageEyebrow(2, 'Uns 10 minutos'),
      title: 'Crie a marca da sua loja',
      text: 'Escolha o nome, monte o logo e defina o texto da loja. As ideias já estão prontas.',
      action: {
        href: BRAND_PATH,
        label: brandStarted ? 'Continuar minha marca' : 'Criar minha marca',
      },
      note: 'Dá pra parar e continuar depois.',
    };
  }
  const current = STORE_PHASES[phase - 1];
  if (phase >= STORE_PHASES.length) {
    return {
      eyebrow: 'Pronto',
      title: 'Sua loja está no ar',
      text: current?.detail ?? '',
      note: 'As vendas vão aparecer aqui.',
    };
  }
  return {
    eyebrow: stageEyebrow(3, 'Em breve'),
    title: current?.title ?? '',
    text: current?.detail ?? '',
    note: 'Estamos preparando essa parte. Avisamos no WhatsApp quando ela abrir.',
  };
}

/**
 * O destaque: o que fazer agora, grande, com o botão. Ao lado, o mascote; depois da marca
 * pronta, o logo dela (dá a sensação de que a loja já existe).
 */
function NextStep({
  phase,
  conversation,
  brand,
}: {
  phase: number;
  conversation: ConversationStatus;
  brand: StorePanelProps['brand'];
}) {
  const hero = heroFor(phase, conversation, brand.started);
  const showLogo = phase >= 3 && brand.logo && brand.name;

  return (
    <section
      aria-labelledby="agora"
      className={cn(panelCard, 'flex-col gap-6 sm:flex-row sm:items-center sm:gap-8')}
    >
      <div className="flex shrink-0 justify-center sm:w-36 lg:w-44">
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoPreviewSrc(brand.logo!)}
            alt={`Logo da loja ${brand.name}`}
            width={176}
            height={176}
            className="size-32 rounded-3xl border border-border lg:size-44"
          />
        ) : (
          <Mascot expression="happy" displaySize={176} className="size-28 sm:size-36 lg:size-44" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-wide text-progress-text uppercase">
          {hero.action ? null : <BellIcon aria-hidden="true" className="size-4" />}
          {hero.eyebrow}
        </p>
        <h2 id="agora" className="text-2xl font-semibold tracking-tight text-balance lg:text-3xl">
          {hero.title}
        </h2>
        <p className="max-w-[60ch] text-body text-pretty text-foreground/80">{hero.text}</p>
        {hero.action ? (
          <div className="mt-1 flex flex-col gap-2">
            <Button asChild className="sm:w-auto sm:self-start sm:px-8">
              <Link href={hero.action.href}>
                {hero.action.label}
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
            <p className="text-sm text-pretty text-muted-foreground">{hero.note}</p>
          </div>
        ) : (
          <p className="text-body text-pretty text-muted-foreground">{hero.note}</p>
        )}
        {hero.action ? null : <TalkToTeam />}
      </div>
    </section>
  );
}

/**
 * Enquanto a próxima fase não abre, a tela não pede nada dela: este é o caminho pra tirar uma
 * dúvida. Só aparece com o número do suporte configurado (config/support.ts).
 */
function TalkToTeam() {
  if (!TEAM_WHATSAPP) return null;
  return (
    <Button asChild variant="soft" className="sm:w-auto sm:px-8">
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

/**
 * O caminho em 3 etapas, cada uma com a sua barra contornada: as feitas cheias de verde, a atual
 * até onde ela chegou (stages.ts) e as próximas vazias. Embaixo da barra, o nome da etapa e o que
 * tem nela. O caminho todo é verde, como o "Etapa 2 de 3" do destaque, que já diz em palavras
 * onde ela está; o azul fica pro botão.
 * Na vertical no celular e lado a lado no computador.
 * Num cartão igual ao do destaque: as duas caixas com a mesma largura e a mesma margem interna,
 * pra o começo e o fim de cada uma se alinharem.
 */
function Path({ stages }: { stages: StageView[] }) {
  return (
    <section aria-labelledby="seu-caminho" className={cn(panelCard, 'gap-5')}>
      <h2
        id="seu-caminho"
        className="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
      >
        Seu caminho
      </h2>
      <ol aria-label="As etapas da sua loja" className="flex flex-col gap-6 lg:grid lg:grid-cols-3">
        {stages.map((stage) => (
          <Stage key={stage.title} stage={stage} />
        ))}
      </ol>
    </section>
  );
}

function Stage({ stage }: { stage: StageView }) {
  const { status } = stage;
  return (
    <li aria-current={status === 'current' ? 'step' : undefined} className="flex flex-col gap-1">
      {/* A barra da etapa: só o desenho, o estado já está escrito no título. */}
      <span
        aria-hidden="true"
        className="relative mb-2 h-2.5 overflow-hidden rounded-full border border-input bg-progress-track forced-colors:border-[CanvasText]"
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-progress forced-colors:bg-[CanvasText]"
          style={{ width: `${stage.fill * 100}%` }}
        />
      </span>
      <span
        className={cn(
          'inline-flex items-start gap-1.5 text-body font-semibold text-balance',
          status === 'current' && 'text-progress-text',
          status === 'next' && 'text-muted-foreground',
        )}
      >
        {status === 'done' ? (
          <CheckIcon aria-hidden="true" className="mt-1 size-4 shrink-0 text-progress" />
        ) : null}
        <span>
          {stage.title}
          <span className="sr-only">
            {/* A atual já é anunciada pelo aria-current ("etapa atual"). */}
            {status === 'done' ? ' (feita)' : status === 'next' ? ' (a seguir)' : ''}
          </span>
        </span>
      </span>
      <span className="text-body text-pretty text-muted-foreground">{stage.detail}</span>
      {/* Na atual com várias fases, em que passo ela está: "Passo 2 de 5: Conexão com a Shopee". */}
      {status === 'current' && stage.step ? (
        <span className="text-sm font-semibold text-pretty text-progress-text">{stage.step}</span>
      ) : null}
    </li>
  );
}
