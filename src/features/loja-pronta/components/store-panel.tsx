import {
  ArrowRightIcon,
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  MessageCircleIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Mascot } from '@/components/brand/mascot';
import { Button } from '@/components/ui/button';
import { STORE_PHASES, STORE_STAGES } from '@/config/store-phases';
import { TEAM_WHATSAPP } from '@/config/support';
import { SHOPEE_CONNECT_PATH, SHOPEE_PATH } from '@/config/shopee';
import { BRAND_PATH, brandStepPath } from '@/features/brand/steps';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { greetingName } from '@/features/products/names';
import { cn } from '@/lib/utils';
import { storeStages, type StageView } from '../stages';
import { canReviseDonePhases } from '../editing';
import { CONVERSATION_PATH, REVIEW_STEP, stepPath } from '../steps';
import type { ConversationStatus } from '../store-phase';
import { whatsappLink } from '../whatsapp';

type StorePanelProps = {
  user: { name: string; email: string; preferredName?: string | null | undefined };
  /** Tem os dois produtos: o topo leva de volta pra escolha. */
  hasChoice: boolean;
  phase: number;
  conversation: ConversationStatus;
  /**
   * A marca, quando já tem: o nome vira o título e o logo aparece no destaque. `logoSrc`: a
   * imagem do logo salvo (brandLogoSrc), quando já tem.
   */
  brand: { name: string | null; logoSrc: string | null; started: boolean; confirmed: boolean };
};

/**
 * Painel da Loja Pronta: um título pessoal, um destaque com a única coisa a fazer agora e, embaixo,
 * o caminho em 3 etapas (as 7 fases agrupadas com as palavras dela). Uma decisão e um mapa
 * simples, em vez de várias listas contando a mesma jornada. No celular, o caminho fica na
 * vertical. Com a marca pronta, o título é o nome da loja.
 */
export function StorePanel({ user, hasChoice, phase, conversation, brand }: StorePanelProps) {
  // Com os dois produtos, ela chega aqui pela escolha de área, que já disse "Oi": sem repetir.
  const name = hasChoice ? '' : greetingName(user);
  return (
    <AreaShell
      account={user}
      hasChoice={hasChoice}
      area="loja-pronta"
      crumb="Loja Pronta"
      title={
        brand.name ?? (name ? `Oi, ${name}! Vamos montar sua loja?` : 'Vamos montar sua loja?')
      }
      intro={brand.name ? 'Sua loja na Shopee' : undefined}
    >
      <NextStep phase={phase} conversation={conversation} brand={brand} />
      <Path
        stages={storeStages(phase)}
        reviewHrefs={
          // Só o que existe pra rever: a conversa enviada e a marca confirmada, até a publicação.
          canReviseDonePhases(phase)
            ? [
                conversation === 'enviada' ? stepPath(REVIEW_STEP) : undefined,
                brand.confirmed ? brandStepPath('revisao') : undefined,
              ]
            : []
        }
      />
    </AreaShell>
  );
}

type Hero = {
  eyebrow: string;
  title: string;
  text: string;
  action?: { href: string; label: string } | undefined;
  /** Linha menor ao lado do botão (ou no lugar dele). */
  note?: string | undefined;
};

/** "Etapa 2 de 3": o destaque diz em que pedaço do caminho ela está. */
function stageEyebrow(stage: number, rest?: string): string {
  const base = `Etapa ${stage} de ${STORE_STAGES.length}`;
  return rest ? `${base} · ${rest}` : base;
}

/** O que o destaque diz em cada momento da loja. */
function heroFor(
  phase: number,
  conversation: ConversationStatus,
  brand: StorePanelProps['brand'],
): Hero {
  if (phase === 1 && conversation !== 'enviada') {
    return {
      eyebrow: stageEyebrow(1),
      title: 'Conte sobre você e sua marca',
      text: 'Umas perguntas rápidas, uma por vez. Com elas, já preparamos ideias de nome, logo e texto pra sua loja.',
      action: {
        href: CONVERSATION_PATH,
        label: conversation === 'em-andamento' ? 'Continuar a conversa' : 'Começar a conversa',
      },
    };
  }
  if (phase <= 2) {
    return {
      eyebrow: stageEyebrow(2),
      title: 'Crie a marca da sua loja',
      text: 'Escolha o nome, crie o logo escolhendo vendo (a nossa IA desenha) e defina o texto da loja.',
      action: {
        href: BRAND_PATH,
        label: brand.started ? 'Continuar minha marca' : 'Criar minha marca',
      },
    };
  }
  // Marca confirmada antes do chat do logo: o logo antigo saiu, e ela cria um novo (em qualquer
  // fase, só ele reabre).
  if (brand.confirmed && !brand.logoSrc) {
    return {
      eyebrow: 'Falta o logo',
      title: 'Crie o logo da sua loja',
      text: 'Agora o logo é feito no estúdio: você escolhe vendo, e a nossa IA desenha. Leva poucos minutos.',
      action: { href: brandStepPath('logo'), label: 'Criar meu logo' },
    };
  }
  const current = STORE_PHASES[phase - 1];
  if (phase === 3) {
    return {
      eyebrow: stageEyebrow(3),
      title: current?.title ?? '',
      text: 'É lá que a sua loja vai ficar. A conta é sua, no seu nome, e leva uns 15 minutos.',
      action: { href: SHOPEE_PATH, label: 'Abrir minha conta na Shopee' },
    };
  }
  if (phase === 4) {
    return {
      eyebrow: stageEyebrow(3, 'Em breve'),
      title: current?.title ?? '',
      text: current?.detail ?? '',
      action: { href: SHOPEE_CONNECT_PATH, label: 'Ver como funciona a conexão' },
      note: 'A conexão abre em breve. Avisamos no WhatsApp quando der pra conectar.',
    };
  }
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
  const hero = heroFor(phase, conversation, brand);
  const showLogo = phase >= 3 && brand.logoSrc && brand.name;

  return (
    <section
      aria-labelledby="agora"
      className={cn(panelCard, 'flex-col gap-6 sm:flex-row sm:items-center sm:gap-8')}
    >
      <div className="flex shrink-0 justify-center sm:w-36 lg:w-44">
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoSrc!}
            alt={`Logo da loja ${brand.name}`}
            width={176}
            height={176}
            className="size-32 rounded-3xl border border-border lg:size-44"
          />
        ) : (
          // Ao lado do que fazer agora: não cochila enquanto a pessoa lê o painel.
          <Mascot
            expression="happy"
            displaySize={176}
            canSleep={false}
            className="size-28 sm:size-36 lg:size-44"
          />
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
            {hero.note ? (
              <p className="text-sm text-pretty text-muted-foreground">{hero.note}</p>
            ) : null}
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
/** `reviewHrefs`: onde rever cada etapa, na ordem (sem link: nada a rever ainda, ou já travada). */
function Path({
  stages,
  reviewHrefs,
}: {
  stages: StageView[];
  reviewHrefs: readonly (string | undefined)[];
}) {
  return (
    <section aria-labelledby="seu-caminho" className={cn(panelCard, 'gap-5')}>
      <h2
        id="seu-caminho"
        className="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
      >
        Seu caminho
      </h2>
      <ol aria-label="As etapas da sua loja" className="flex flex-col gap-6 lg:grid lg:grid-cols-3">
        {stages.map((stage, index) => (
          <Stage
            key={stage.title}
            stage={stage}
            reviewHref={stage.status === 'done' ? reviewHrefs[index] : undefined}
          />
        ))}
      </ol>
    </section>
  );
}

/**
 * Uma etapa do caminho. Feita e ainda aberta pra mudanças (até a publicação), ganha "Ver e
 * editar": ela revê o que respondeu ou escolheu e muda, sem voltar de fase.
 */
function Stage({ stage, reviewHref }: { stage: StageView; reviewHref?: string | undefined }) {
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
      {reviewHref ? (
        <Link
          href={reviewHref}
          aria-label={`Ver e editar: ${stage.title}`}
          className="group -ml-2 inline-flex min-h-11 items-center gap-0.5 self-start rounded-full px-2 font-semibold text-link outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
        >
          <span className="underline-offset-4 group-hover:underline">Ver e editar</span>
          <ChevronRightIcon
            aria-hidden="true"
            className="size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
          />
        </Link>
      ) : null}
    </li>
  );
}
