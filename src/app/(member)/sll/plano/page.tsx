import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { requireProduct } from '@/features/products/server/access';
import { getAssistantPlan } from '@/features/assistant/server/plans';
import {
  startAssistantPlan,
  markAssistantTask,
  restartAssistantPlan,
  queueStoreCollection,
} from '@/features/assistant/server/actions';
import { STRATEGIES, STRATEGY_LABELS, planNeedsHistory } from '@/features/assistant/model';
import { getStudentExperience } from '@/features/sll/server/experience';
import { chooseExpert } from '@/features/sll/server/experience-actions';
import { EXPERT_LABELS } from '@/config/experts';
import { SllFlashMessage } from '@/features/sll/components/sll-flash-message';
import { readAssistantAdvice } from '@/features/assistant/server/advice';
import { requestAssistantAdvice } from '@/features/assistant/server/advice-actions';
import { adviceSchema, GUIDANCE_COPY } from '@/features/assistant/guidance';
import { readStoreObservations } from '@/features/assistant/server/metrics';
import { getParam, type SearchParams } from '@/lib/search-params';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Meu plano · SLL' };
const messages: Record<string, string> = {
  invalid: 'Confira os campos e tente novamente.',
  preparing: 'O roteiro escolhido está em preparação. Ele será mostrado quando for publicado.',
  started: 'Seu plano foi salvo.',
  history: 'Sua loja segue pelo caminho de análise dos dados disponíveis.',
  queued: 'Atualização solicitada. Os dados serão coletados pela rotina da plataforma.',
  'connection-required': 'Conecte sua loja para atualizar os dados.',
  'task-saved': 'Progresso salvo.',
  'expert-saved': 'Seu conteúdo foi atualizado.',
  'expert-invalid': 'Escolha um conteúdo disponível na sua conta.',
};
// Resultados que pedem uma correção: aparecem como alerta, não como confirmação.
const failedResults = new Set(['invalid', 'connection-required', 'expert-invalid']);
const adviceNotices = new Set(['advice-ready', 'advice-limited', 'advice-collect']);

/** Uma frase pra cada caminho: a aluna iniciante não sabe o que é orgânico ou pago. */
const STRATEGY_HINTS: Record<(typeof STRATEGIES)[number], string> = {
  organic: 'sem pagar anúncios',
  hybrid: 'parte sem anúncio, parte com anúncio pago',
  paid: 'com anúncios pagos da Shopee',
};

const STORE_AGES = [
  // Quem ainda não abriu a loja segue o mesmo roteiro de loja nova.
  ['under_7_days', 'Ainda não abri ou abri há menos de 7 dias'],
  ['exactly_7_days', 'Exatamente 7 dias'],
  ['over_7_days', 'Mais de 7 dias'],
] as const;

/**
 * Situação dos dados da loja: uma etiqueta curta à vista e a frase completa no tooltip. A frase
 * também aparece como linha quando pede uma ação (coleta em andamento, falha, atraso).
 */
const STORE_STATUS = {
  unavailable: {
    label: 'Não conectada',
    tone: 'neutral',
    text: 'Conecte a loja para começar a acompanhar os dados disponíveis.',
  },
  pending: { label: 'Coletando', tone: 'neutral', text: 'A primeira coleta ainda não terminou.' },
  failure: {
    label: 'Falhou',
    tone: 'danger',
    text: 'A última coleta falhou. Nenhum resultado foi substituído por zero.',
  },
  outdated: {
    label: 'Atrasado',
    tone: 'warning',
    text: 'Os dados estão atrasados. Solicite uma nova atualização.',
  },
  stale: {
    label: 'Última falhou',
    tone: 'warning',
    text: 'A última atualização falhou. Abaixo estão os últimos dados completos.',
  },
  ready: {
    label: 'Atualizado',
    tone: 'good',
    text: 'Os contadores abaixo são acumulados dos anúncios. Mudanças no período exigem duas coletas completas. Cliques e impressões não são informados por esta consulta.',
  },
} as const;
const STATUS_TONES = {
  neutral: 'bg-muted text-muted-foreground',
  danger: 'bg-destructive-soft text-destructive',
  warning: 'bg-muted text-warning',
  good: 'bg-primary-soft text-link',
} as const;

/**
 * Cartão desta tela: mais compacto que o `panelCard`, sem sombra (o tom separa do fundo) e com
 * entrada suave. Movimento reduzido: aparece direto.
 */
const planCard =
  'flex flex-col gap-4 rounded-card bg-card p-5 shadow-card sm:p-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 forced-colors:border forced-colors:border-[CanvasText]';
const cardTitle = 'text-heading font-semibold text-balance';
/** Resposta em caixa: a escolhida ganha contorno e o check; o rádio continua acessível. */
const optionTile =
  'group/tile flex min-h-13 cursor-pointer items-center gap-3 rounded-2xl border border-border px-3.5 py-2.5 text-body transition-[background-color,border-color,transform] duration-150 hover:bg-muted active:scale-[0.98] has-checked:border-primary has-checked:ring-1 has-checked:ring-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring motion-reduce:transition-none motion-reduce:active:scale-100';
const stepBadge =
  'grid size-7 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold text-foreground';

/** Rádio desenhado como o selo de verificado da Apple: círculo vazio, azul cheio quando marcado. */
const optionRadio =
  'peer col-start-1 row-start-1 size-6 cursor-pointer appearance-none rounded-full border-[1.5px] border-input transition-[background-color,border-color] duration-200 checked:border-primary checked:bg-primary before:content-none focus-visible:outline-none motion-reduce:transition-none';

/**
 * Moldura do rádio com o check branco por cima. O input fica nativo e escrito no label de quem usa
 * (teclado, leitor de tela e envio sem JavaScript).
 */
function OptionRadioMark({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center">
      {children}
      {/* O ponto do rádio global (::before) sai; no lugar entra este check, fino e centrado. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none col-start-1 row-start-1 hidden size-6 text-primary-foreground peer-checked:block motion-safe:peer-checked:animate-in motion-safe:peer-checked:duration-200 motion-safe:peer-checked:fade-in-0 motion-safe:peer-checked:zoom-in-75 forced-colors:hidden"
      >
        <path d="M6.75 12.25 10.25 15.75 17.25 8.25" />
      </svg>
    </span>
  );
}

/** Explicação que fica no tooltip: o ícone mostra o texto ao passar o mouse e o leitor de tela lê. */
function InfoHint({ text }: { text: string }) {
  return (
    <span title={text} className="inline-grid size-7 shrink-0 cursor-help place-items-center">
      <Info aria-hidden="true" className="size-5 text-muted-foreground" />
      <span className="sr-only">{text}</span>
    </span>
  );
}

/** Barra do plano entre 0 e 100%, mesmo sem ações ou com conclusões que saíram do plano. */
function planProgressPercent(completed: number, total: number) {
  if (total === 0) return 0;
  return Math.min(100, (completed / total) * 100);
}

export default async function AssistantPlanPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session, products } = await requireProduct('sll', '/sll/plano');
  const [{ plan, completedIds, intake }, experience, data, params, guidance] = await Promise.all([
    getAssistantPlan(session.user.id),
    getStudentExperience(session.user.id),
    readStoreObservations(session.user.id),
    searchParams,
    readAssistantAdvice(session.user.id),
  ]);
  const result = getParam(params.resultado) ?? '';
  const message =
    messages[result] ??
    (result.startsWith('advice-')
      ? result === 'advice-ready'
        ? 'As prioridades foram atualizadas.'
        : result === 'advice-limited'
          ? 'Você já usou as orientações disponíveis hoje. Continue acompanhando os dados.'
          : result === 'advice-collect'
            ? 'Solicite uma coleta atualizada antes de gerar prioridades.'
            : 'A orientação não pôde ser atualizada. Os dados e as ações disponíveis continuam abaixo.'
      : undefined);
  const parsedAdvice =
    guidance.advice?.status === 'ready'
      ? adviceSchema.safeParse({ priorities: guidance.advice.priorities })
      : null;
  const priorities = parsedAdvice?.success
    ? parsedAdvice.data.priorities
    : guidance.candidates.slice(0, 3);
  const history = !plan && intake && planNeedsHistory(intake.storeAge);
  const status = STORE_STATUS[data.status];
  const lastCompletedRun = data.runs.find((run) => run.status === 'completed');
  const showGuidance = Boolean(history && data.status === 'ready' && data.items.length);
  // O dia aberto é o primeiro que falta: o resto fica fechado, só com o título.
  const nextActionId = plan?.actions.find((action) => !completedIds.includes(action.id))?.id;

  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title="Meu plano"
      intro={
        plan
          ? 'Siga um dia por vez e marque cada ação quando terminar.'
          : history
            ? 'Sua loja já tem histórico. Comece pelo que os dados dela mostram.'
            : 'Conte há quanto tempo sua loja está aberta e montamos o seu roteiro.'
      }
      headerAside={
        <div className="flex flex-col items-start gap-2">
          <p
            title="As aulas seguem o conteúdo que veio com a sua compra. Seu progresso continua salvo."
            className="inline-flex min-h-9 cursor-help items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm font-semibold"
          >
            <BookOpen aria-hidden="true" className="size-4 text-link" />
            Seu conteúdo com {EXPERT_LABELS[experience.expert]}
            <span className="sr-only">
              . As aulas seguem o conteúdo que veio com a sua compra. Seu progresso continua salvo.
            </span>
          </p>
          {experience.allowed.length > 1 ? (
            <details className="group/expert">
              <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-link [&::-webkit-details-marker]:hidden">
                Trocar
              </summary>
              <form action={chooseExpert} className="flex flex-col gap-3 pt-2">
                <label htmlFor="plan-expert-choice" className="text-body">
                  Conteúdo disponível na sua conta
                </label>
                <Select id="plan-expert-choice" name="expert" defaultValue={experience.expert}>
                  {experience.allowed.map((expert) => (
                    <option value={expert} key={expert}>
                      {EXPERT_LABELS[expert]}
                    </option>
                  ))}
                </Select>
                <Button variant="soft">Usar este conteúdo</Button>
              </form>
            </details>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {message ? (
          <SllFlashMessage
            message={message}
            failed={
              failedResults.has(result) ||
              (result.startsWith('advice-') && !adviceNotices.has(result))
            }
          />
        ) : null}

        {!plan && !history ? (
          <section className={planCard} aria-labelledby="plan-start">
            <div className="flex items-center gap-2">
              <h2 id="plan-start" className={cardTitle}>
                Vamos organizar seu próximo passo
              </h2>
              <InfoHint text="Para uma loja nova, escolha um roteiro de sete dias. Com sete dias ou mais, começamos pela leitura dos dados da loja." />
            </div>
            {/* Os dois passos ficam à vista: a aluna marca o caminho sem esperar a tela mudar. */}
            <form action={startAssistantPlan} className="group/plan flex flex-col gap-5">
              <fieldset className="flex min-w-0 flex-col gap-2.5">
                <legend className="mb-2.5 flex items-center gap-2.5 text-body font-semibold">
                  <span aria-hidden="true" className={stepBadge}>
                    1
                  </span>
                  Há quanto tempo sua loja está aberta?
                </legend>
                <div className="grid gap-2.5 md:grid-cols-3">
                  {STORE_AGES.map(([value, label]) => (
                    <label key={value} className={optionTile}>
                      <OptionRadioMark>
                        <input
                          type="radio"
                          name="storeAge"
                          value={value}
                          required
                          className={optionRadio}
                        />
                      </OptionRadioMark>
                      <span className="flex-1">{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="flex min-w-0 flex-col gap-2.5">
                <legend className="mb-2.5 flex items-center gap-2.5 text-body font-semibold">
                  <span aria-hidden="true" className={stepBadge}>
                    2
                  </span>
                  Para uma loja nova, qual caminho você quer seguir?
                </legend>
                <div className="grid gap-2.5 md:grid-cols-3">
                  {STRATEGIES.map((strategy) => (
                    <label key={strategy} className={optionTile}>
                      <OptionRadioMark>
                        <input
                          type="radio"
                          name="strategy"
                          value={strategy}
                          className={optionRadio}
                        />
                      </OptionRadioMark>
                      <span className="flex flex-1 flex-col font-semibold">
                        {STRATEGY_LABELS[strategy]}
                        <span className="text-sm font-normal text-muted-foreground">
                          {STRATEGY_HINTS[strategy]}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="hidden text-sm text-muted-foreground group-has-[[value^=exactly]:checked]/plan:block group-has-[[value^=over]:checked]/plan:block">
                Com sete dias ou mais, começamos pela leitura dos dados da loja.
              </p>
              <Button>Organizar meu plano</Button>
            </form>
          </section>
        ) : null}

        {plan ? (
          <section className={planCard} aria-labelledby="active-plan">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="active-plan" className={cardTitle}>
                Sete dias · {STRATEGY_LABELS[plan.strategy]}
              </h2>
              <p className="text-sm text-muted-foreground" title="Siga no seu ritmo.">
                {completedIds.length} de {plan.actions.length} ações concluídas
              </p>
            </div>
            <div
              aria-hidden="true"
              className="h-1.5 overflow-hidden rounded-full bg-progress-track"
            >
              <div
                className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-500"
                style={{
                  width: `${planProgressPercent(completedIds.length, plan.actions.length)}%`,
                }}
              />
            </div>
            <ol className="flex flex-col">
              {plan.actions.map((action, index) => {
                const completed = completedIds.includes(action.id);
                return (
                  <li key={action.id} className={cn(index > 0 && 'border-t border-border')}>
                    <details open={action.id === nextActionId} className="group/day">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl text-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                        <span
                          aria-hidden="true"
                          className={cn(
                            'grid size-5.5 shrink-0 place-items-center rounded-full border-2',
                            completed
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input group-open/day:border-primary',
                          )}
                        >
                          {completed ? <Check className="size-3.5" strokeWidth={3} /> : null}
                        </span>
                        <span className="w-12 shrink-0 text-sm text-muted-foreground max-sm:hidden">
                          Dia {action.day}
                        </span>
                        <span
                          className={cn(
                            'min-w-0 flex-1',
                            completed ? 'text-muted-foreground' : 'font-semibold',
                          )}
                        >
                          <span className="sm:sr-only">Dia {action.day}: </span>
                          {action.title}
                        </span>
                        {completed ? (
                          <span className="shrink-0 text-sm font-semibold text-link">Feito</span>
                        ) : null}
                      </summary>
                      <div className="flex flex-col items-start gap-2.5 pb-3.5 pl-8 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 sm:pl-22">
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                        <div className="flex flex-wrap gap-3">
                          <form action={markAssistantTask}>
                            <input type="hidden" name="planId" value={plan.id} />
                            <input type="hidden" name="actionId" value={action.id} />
                            <input
                              type="hidden"
                              name="completed"
                              value={completed ? 'false' : 'true'}
                            />
                            <Button
                              variant={completed ? 'soft' : 'default'}
                              size="inline"
                              className="px-5"
                            >
                              {completed ? 'Marcar como não feita' : 'Marcar como feita'}
                            </Button>
                          </form>
                          {action.lessonId ? (
                            <Button asChild variant="soft" size="inline" className="px-5">
                              <Link href={`/sll/aula/${action.lessonId}`}>Ver a aula</Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        {history ? (
          <section className={planCard} aria-labelledby="history-plan">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <h2 id="history-plan" className={cardTitle}>
                  Seu próximo passo começa pelos dados
                </h2>
                <InfoHint text="Vamos usar as informações autorizadas da sua loja. Dados ausentes ou atrasados não significam zero vendas." />
              </div>
              <Button asChild variant="soft" size="inline" className="px-5">
                <Link href="/sll/minhas-lojas/conectar">Conferir a conexão da loja</Link>
              </Button>
            </div>
            {showGuidance ? (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <h3
                  className="text-body font-semibold"
                  title={
                    parsedAdvice?.success
                      ? 'Prioridades organizadas com ajuda de IA a partir das observações da loja.'
                      : 'Sugestões pelas regras de acompanhamento. Elas usam os dados disponíveis da sua loja.'
                  }
                >
                  Próximos passos com os dados disponíveis
                </h3>
                <ol className="flex flex-col gap-3">
                  {priorities.map((priority, index) => {
                    const copy = GUIDANCE_COPY[priority.action];
                    const item = data.items.find((row) => row.itemId === priority.itemId);
                    return (
                      <li key={`${priority.action}:${priority.itemId}`} className="flex gap-3">
                        <span aria-hidden="true" className={stepBadge}>
                          {index + 1}
                        </span>
                        <div className="flex min-w-0 flex-col">
                          <p className="text-body font-semibold">
                            {copy.title}
                            {item ? (
                              <span className="font-medium text-link"> · {item.title}</span>
                            ) : null}
                          </p>
                          <p className="text-sm text-muted-foreground">{copy.description}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {guidance.enabled && !guidance.advice ? (
                    <form action={requestAssistantAdvice}>
                      <Button variant="soft" size="inline" className="px-5">
                        Organizar prioridades com IA
                      </Button>
                    </form>
                  ) : !guidance.enabled ? (
                    <p className="text-sm text-muted-foreground">
                      A orientação com IA está em preparação.
                    </p>
                  ) : null}
                  <Button asChild variant="link" size="inline" className="text-sm font-semibold">
                    <Link href="/sll/metodo">Consultar as aulas do método</Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className={planCard} aria-labelledby="store-data">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <h2 id="store-data" className={cardTitle}>
                O que sua loja mostra
              </h2>
              <p
                title={status.text}
                className={cn(
                  'inline-flex min-h-7 cursor-help items-center rounded-full px-3 text-sm font-semibold',
                  STATUS_TONES[status.tone],
                )}
              >
                {status.label}
                <span className="sr-only">. {status.text}</span>
              </p>
            </div>
            {data.status === 'unavailable' ? (
              <Button asChild variant="soft" size="inline" className="px-5">
                <Link href="/sll/minhas-lojas/conectar">Conectar minha loja</Link>
              </Button>
            ) : (
              <form action={queueStoreCollection}>
                <Button variant="soft" size="inline" className="px-5">
                  Solicitar atualização
                </Button>
              </form>
            )}
          </div>
          {data.status === 'unavailable' ? null : (
            <>
              {data.status !== 'ready' ? (
                <p className="text-sm text-muted-foreground" aria-hidden="true">
                  {status.text}
                </p>
              ) : null}
              {lastCompletedRun ? (
                <p className="text-sm text-muted-foreground">
                  Última coleta completa:{' '}
                  {lastCompletedRun.startedAt.toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                  })}{' '}
                  (horário de Brasília).
                </p>
              ) : null}
              {data.items.length ? (
                <table className="w-full text-left text-body">
                  <thead className="text-sm text-muted-foreground max-sm:sr-only">
                    <tr>
                      <th scope="col" className="pb-2 font-normal">
                        Anúncio
                      </th>
                      <th scope="col" className="pb-2 text-right font-normal">
                        Visualizações acumuladas
                      </th>
                      <th scope="col" className="pb-2 text-right font-normal">
                        Vendas acumuladas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr
                        key={item.itemId}
                        className="border-t border-border max-sm:flex max-sm:flex-wrap max-sm:gap-x-3 max-sm:py-2.5"
                      >
                        <td className="py-2.5 pr-3 max-sm:w-full max-sm:p-0">{item.title}</td>
                        <td className="py-2.5 text-right text-sm text-muted-foreground tabular-nums max-sm:p-0">
                          {item.views ?? 'Não informadas'}
                          <span className="sm:hidden"> visualizações</span>
                        </td>
                        <td className="py-2.5 pl-3 text-right text-sm text-muted-foreground tabular-nums max-sm:p-0">
                          {item.sales ?? 'Não informadas'}
                          <span className="sm:hidden"> vendas</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : data.status === 'ready' ? (
                <p className="text-sm text-muted-foreground">
                  A consulta não encontrou anúncios ativos nesta loja.
                </p>
              ) : null}
              <Button asChild variant="link" size="inline" className="w-fit text-sm font-semibold">
                <Link href="/sll/comparar-categorias">Comparar categorias</Link>
              </Button>
            </>
          )}
        </section>

        {plan || history ? (
          <details className="group/restart px-1">
            <summary
              title="O plano atual ficará no histórico. As aulas concluídas continuam salvas."
              className="flex min-h-11 w-fit cursor-pointer list-none items-center text-sm font-semibold text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"
            >
              Reorganizar meu plano
            </summary>
            <div className="flex flex-wrap items-center gap-3 pt-1 motion-safe:animate-in motion-safe:fade-in-0">
              <p className="text-sm text-muted-foreground">
                O plano atual ficará no histórico. As aulas concluídas continuam salvas.
              </p>
              <form action={restartAssistantPlan}>
                <Button variant="soft" size="inline" className="px-5">
                  Começar um novo plano
                </Button>
              </form>
            </div>
          </details>
        ) : null}
      </div>
    </SllAreaShell>
  );
}
