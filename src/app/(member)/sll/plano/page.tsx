import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { panelCard } from '@/features/member/components/area-shell';
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
import { readAssistantAdvice } from '@/features/assistant/server/advice';
import { requestAssistantAdvice } from '@/features/assistant/server/advice-actions';
import { adviceSchema, GUIDANCE_COPY } from '@/features/assistant/guidance';
import { readStoreObservations } from '@/features/assistant/server/metrics';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Meu plano · SLL' };
const messages: Record<string, string> = {
  invalid: 'Confira os campos e tente novamente.',
  preparing: 'O roteiro escolhido está em preparação. Ele será mostrado quando for publicado.',
  started: 'Seu plano foi salvo.',
  history: 'Sua loja segue pelo caminho de análise dos dados disponíveis.',
  queued: 'Atualização solicitada. Os dados serão coletados pela rotina da plataforma.',
  'connection-required': 'Conecte sua loja para atualizar os dados.',
  'task-saved': 'Progresso salvo.',
  'expert-saved': 'Sua experiência foi atualizada.',
  'expert-invalid': 'Escolha uma experiência disponível na sua conta.',
};

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
  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title="Meu plano"
      intro="Um caminho de cada vez, com ações práticas e aulas para ajudar você a executar."
    >
      {message ? <output className="text-body">{message}</output> : null}
      <section className={panelCard} aria-labelledby="plan-expert">
        <h2 id="plan-expert" className="text-title font-semibold">
          Seu conteúdo com {EXPERT_LABELS[experience.expert]}
        </h2>
        <p className="text-body text-muted-foreground">
          As aulas acompanham o expert da sua compra. Seu progresso continua salvo.
        </p>
        {experience.allowed.length > 1 ? (
          <form action={chooseExpert} className="flex flex-col gap-3">
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
        ) : null}
      </section>
      {!plan && !history ? (
        <section className={panelCard} aria-labelledby="plan-start">
          <h2 id="plan-start" className="text-title font-semibold">
            Vamos organizar seu próximo passo
          </h2>
          <p className="text-body text-muted-foreground">
            Para uma loja nova, escolha um roteiro de sete dias. Com sete dias ou mais, começamos
            pela leitura dos dados da loja.
          </p>
          <form action={startAssistantPlan} className="flex flex-col gap-5">
            <fieldset className="space-y-3">
              <legend className="mb-2 text-body font-semibold">
                Há quanto tempo sua loja está aberta?
              </legend>
              {[
                ['under_7_days', 'Menos de 7 dias'],
                ['exactly_7_days', 'Exatamente 7 dias'],
                ['over_7_days', 'Mais de 7 dias'],
              ].map(([value, label]) => (
                <label key={value} className="flex min-h-12 items-center gap-3 text-body">
                  <input type="radio" name="storeAge" value={value} required className="size-5" />
                  {label}
                </label>
              ))}
            </fieldset>
            <label htmlFor="plan-strategy" className="text-body">
              Para uma loja nova, qual caminho você quer seguir?
            </label>
            <Select name="strategy" id="plan-strategy" defaultValue="organic">
              {STRATEGIES.map((strategy) => (
                <option value={strategy} key={strategy}>
                  {STRATEGY_LABELS[strategy]}
                </option>
              ))}
            </Select>
            <Button>Organizar meu plano</Button>
          </form>
        </section>
      ) : null}
      {plan ? (
        <section className={panelCard} aria-labelledby="active-plan">
          <h2 id="active-plan" className="text-title font-semibold">
            Sete dias · {STRATEGY_LABELS[plan.strategy]}
          </h2>
          <p className="text-body text-muted-foreground">
            {completedIds.length} de {plan.actions.length} ações concluídas. Siga no seu ritmo.
          </p>
          <ol className="space-y-5">
            {plan.actions.map((action) => {
              const completed = completedIds.includes(action.id);
              return (
                <li key={action.id} className="rounded-2xl border border-border p-4">
                  <p className="text-sm font-semibold text-link">
                    Dia {action.day}
                    {completed ? ' · Feito' : ''}
                  </p>
                  <h3 className="mt-2 text-body font-semibold">{action.title}</h3>
                  <p className="mt-2 text-body text-muted-foreground">{action.description}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {action.lessonId ? (
                      <Button asChild variant="soft" size="inline">
                        <Link href={`/sll/aula/${action.lessonId}`}>Ver a aula</Link>
                      </Button>
                    ) : null}
                    <form action={markAssistantTask}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <input type="hidden" name="actionId" value={action.id} />
                      <input type="hidden" name="completed" value={completed ? 'false' : 'true'} />
                      <Button variant="soft" size="inline">
                        {completed ? 'Marcar como não feita' : 'Marcar como feita'}
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
      {history ? (
        <section className={panelCard} aria-labelledby="history-plan">
          <h2 id="history-plan" className="text-title font-semibold">
            Seu próximo passo começa pelos dados
          </h2>
          <p className="text-body text-muted-foreground">
            Vamos usar as informações autorizadas da sua loja. Dados ausentes ou atrasados não
            significam zero vendas.
          </p>
          <Button asChild variant="soft">
            <Link href="/sll/minhas-lojas/conectar">Conferir a conexão da loja</Link>
          </Button>
        </section>
      ) : null}
      <section className={panelCard} aria-labelledby="store-data">
        <h2 id="store-data" className="text-title font-semibold">
          O que sua loja mostra
        </h2>
        {data.status === 'unavailable' ? (
          <>
            <p className="text-body text-muted-foreground">
              Conecte a loja para começar a acompanhar os dados disponíveis.
            </p>
            <Button asChild variant="soft">
              <Link href="/sll/minhas-lojas/conectar">Conectar minha loja</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-body text-muted-foreground">
              {data.status === 'failure'
                ? 'A última coleta falhou. Nenhum resultado foi substituído por zero.'
                : data.status === 'pending'
                  ? 'A primeira coleta ainda não terminou.'
                  : data.status === 'outdated'
                    ? 'Os dados estão atrasados. Solicite uma nova atualização.'
                    : data.status === 'stale'
                      ? 'A última atualização falhou. Abaixo estão os últimos dados completos.'
                      : 'Os contadores abaixo são acumulados dos anúncios. Mudanças no período exigem duas coletas completas. Cliques e impressões não são informados por esta consulta.'}
            </p>
            {data.runs.find((run) => run.status === 'completed') ? (
              <p className="text-sm text-muted-foreground">
                Última coleta completa:{' '}
                {data.runs
                  .find((run) => run.status === 'completed')!
                  .startedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}{' '}
                (horário de Brasília).
              </p>
            ) : null}
            <form action={queueStoreCollection}>
              <Button variant="soft">Solicitar atualização</Button>
            </form>
            {data.items.length ? (
              <ul className="space-y-3">
                {data.items.map((item) => (
                  <li key={item.itemId} className="rounded-2xl border border-border p-4 text-body">
                    <strong>{item.title}</strong>
                    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Visualizações acumuladas</dt>
                        <dd>{item.views ?? 'Não informadas'}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Vendas acumuladas</dt>
                        <dd>{item.sales ?? 'Não informadas'}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            ) : data.status === 'ready' ? (
              <p className="text-body text-muted-foreground">
                A consulta não encontrou anúncios ativos nesta loja.
              </p>
            ) : null}
            <Button asChild variant="soft">
              <Link href="/sll/comparar-categorias">Comparar categorias</Link>
            </Button>
          </>
        )}
      </section>
      {history && data.status === 'ready' && data.items.length ? (
        <section className={panelCard} aria-labelledby="store-guidance">
          <h2 id="store-guidance" className="text-title font-semibold">
            Próximos passos com os dados disponíveis
          </h2>
          <p className="text-body text-muted-foreground">
            {parsedAdvice?.success
              ? 'Prioridades organizadas com ajuda de IA a partir das observações da loja.'
              : 'Sugestões pelas regras de acompanhamento. Elas usam os dados disponíveis da sua loja.'}
          </p>
          <ol className="space-y-4">
            {priorities.map((priority) => {
              const copy = GUIDANCE_COPY[priority.action];
              const item = data.items.find((row) => row.itemId === priority.itemId);
              return (
                <li
                  key={`${priority.action}:${priority.itemId}`}
                  className="rounded-2xl border border-border p-4"
                >
                  <h3 className="text-body font-semibold">{copy.title}</h3>
                  {item ? <p className="text-body text-link">{item.title}</p> : null}
                  <p className="mt-2 text-body text-muted-foreground">{copy.description}</p>
                </li>
              );
            })}
          </ol>
          <Button asChild variant="soft">
            <Link href="/sll/metodo">Consultar as aulas do método</Link>
          </Button>
          {guidance.enabled && !guidance.advice ? (
            <form action={requestAssistantAdvice}>
              <Button variant="soft">Organizar prioridades com IA</Button>
            </form>
          ) : !guidance.enabled ? (
            <p className="text-body text-muted-foreground">
              A orientação com IA está em preparação.
            </p>
          ) : null}
        </section>
      ) : null}
      {plan || history ? (
        <details className={panelCard}>
          <summary className="min-h-11 cursor-pointer text-body font-semibold">
            Reorganizar meu plano
          </summary>
          <p className="text-body text-muted-foreground">
            O plano atual ficará no histórico. As aulas concluídas continuam salvas.
          </p>
          <form action={restartAssistantPlan}>
            <Button variant="soft">Começar um novo plano</Button>
          </form>
        </details>
      ) : null}
    </SllAreaShell>
  );
}
