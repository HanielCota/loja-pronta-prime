import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { AutoRefresh } from '@/features/admin/components/auto-refresh';
import { panelCard } from '@/features/member/components/area-shell';
import { DEFAULT_SUPPORT_CATALOG, describeTopic, OTHER_ISSUE_ID } from '@/features/support/catalog';
import { SUPPORT_TOPICS } from '@/features/support/contacts';
import { loadSupportCatalog } from '@/features/support/server/catalog';
import { requireStaff } from '@/features/support/server/staff-guard';
import {
  attention,
  describeMinutes,
  describeRate,
  analyzePerformance,
  heatmap,
  median,
  MIN_SAMPLE,
  overview,
  people,
  PERSON_STATUS_LABELS,
  topics,
  volume,
  type PersonRow,
  type Rate,
} from '@/features/support-desk/performance';
import { loadPerformance } from '@/features/support-desk/server/performance-data';
import { getParam, type SearchParams } from '@/lib/search-params';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Desempenho do suporte',
  robots: { index: false, follow: false },
};

const PERIODS = [7, 30, 90] as const;
const SECTIONS = [
  ['geral', 'Visão geral'],
  ['equipe', 'Equipe'],
  ['assuntos', 'Assuntos'],
] as const;
const CHARTS = [
  ['volume', 'Entrou × saiu'],
  ['resposta', '1ª resposta'],
  ['horarios', 'Horários'],
] as const;
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const pill = (active: boolean) =>
  cn(
    'inline-flex min-h-11 items-center rounded-full px-4 text-body outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    active
      ? 'bg-primary-soft font-semibold text-link'
      : 'bg-card text-foreground shadow-card hover:bg-muted',
  );

function Tile({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint: string;
  delta?: string | null;
}) {
  return (
    <div className={cn(panelCard, 'gap-2 !p-5')}>
      <span className="text-body font-semibold">{label}</span>
      <span className="text-title-lg font-semibold tabular-nums">{value}</span>
      <span className="text-sm text-muted-foreground">{hint}</span>
      {delta ? <span className="text-sm text-muted-foreground">{delta}</span> : null}
    </div>
  );
}

/** "Antes: 3 h": o mesmo número no período anterior. */
function previousLabel(now: number | null, old: number | null, format: (value: number) => string) {
  return now === null || old === null ? null : `Antes: ${format(old)}`;
}

function rateHint(value: Rate) {
  if (value.value === null) return 'Sem dados no período';
  return `${Math.round(value.value * 100)}% de ${value.total}`;
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={cn(panelCard, 'gap-4 !p-5 sm:!p-6')}>
      <h2 className="text-title font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function statusTone(person: PersonRow) {
  if (person.status === 'late' || person.status === 'support')
    return 'bg-destructive-soft text-destructive';
  if (person.status === 'above') return 'bg-primary-soft text-link';
  return 'bg-muted text-muted-foreground';
}

function statusLabel(person: PersonRow) {
  return person.status === 'late'
    ? `${person.lateNow} ${PERSON_STATUS_LABELS.late}`
    : PERSON_STATUS_LABELS[person.status];
}

/**
 * Desempenho do suporte (supervisor e administrador). Três perguntas: a equipe dá conta? resolve
 * de verdade? quem precisa de apoio, e em quê? E do que as alunas mais reclamam. Sem ranking.
 */
export default async function SupportPerformancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff('/admin/suporte/desempenho', 'support.metrics');
  const params = await searchParams;
  const daysParam = Number(getParam(params.dias));
  const days = (PERIODS as readonly number[]).includes(daysParam) ? (daysParam as 7 | 30 | 90) : 30;
  const section = SECTIONS.find(([key]) => key === getParam(params.secao))?.[0] ?? 'geral';
  const chart = CHARTS.find(([key]) => key === getParam(params.grafico))?.[0] ?? 'volume';
  const personId = getParam(params.pessoa) ?? null;
  const [data, catalog] = await Promise.all([loadPerformance(days), loadSupportCatalog()]);
  const topicLabel = (id: string) =>
    catalog.find((topic) => topic.id === id)?.label ??
    DEFAULT_SUPPORT_CATALOG.find((topic) => topic.id === id)?.label ??
    id;
  const analysis = analyzePerformance(data.current);
  const ticketsById = new Map(data.current.tickets.map((ticket) => [ticket.id, ticket]));
  const current = overview(data.current, analysis);
  const before = overview(data.previous);
  const team = people(data.current, analysis);
  const items = attention(
    data.current,
    data.previous,
    { unassigned: data.unassigned, topicLabel, faqStillNeedHelp: data.faq },
    analysis,
  );
  const href = (updates: Record<string, string>) => {
    const next = new URLSearchParams({
      dias: String(days),
      secao: section,
      grafico: chart,
      ...updates,
    });
    for (const key of Array.from(next.keys())) if (!next.get(key)) next.delete(key);
    return `/admin/suporte/desempenho?${next}`;
  };
  const series = volume(data.current, days, analysis);
  const maxVolume = Math.max(1, ...series.flatMap((point) => [point.entered, point.left]));
  const responses = analysis.responses;
  const responseSeries = series.map((point, index) => {
    const bucketMs = days <= 7 ? 86_400_000 : 7 * 86_400_000;
    const start = data.current.from.getTime() + index * bucketMs;
    const values = responses
      .filter((item) => {
        const ticket = ticketsById.get(item.ticketId);
        return (
          ticket &&
          ticket.createdAt.getTime() >= start &&
          ticket.createdAt.getTime() < start + bucketMs
        );
      })
      .map((item) => item.minutes);
    return { label: point.label, value: median(values) };
  });
  const maxResponse = Math.max(1, ...responseSeries.map((point) => point.value ?? 0));
  const map = heatmap(data.current);
  const maxCell = Math.max(1, ...map.cells.flat());
  const topicRows = topics(data.current, data.previous, analysis);
  const person = personId ? team.find((member) => member.id === personId) : undefined;
  const personResolutions = person
    ? analysis.resolved.filter((item) => item.resolverId === person.id)
    : [];

  return (
    <AdminPage
      title="Desempenho do suporte"
      intro={`Últimos ${days} dias. A equipe dá conta? Resolve de verdade? Quem precisa de apoio, e em quê?`}
      backLink={{ href: '/admin/chamados', label: 'Fila de chamados' }}
    >
      <AutoRefresh everyMs={60_000} />
      <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
        <nav aria-label="Partes do desempenho" className="flex flex-wrap gap-2">
          {SECTIONS.map(([key, label]) => (
            <Link
              key={key}
              href={href({ secao: key, pessoa: '' })}
              aria-current={section === key && !person ? 'page' : undefined}
              className={pill(section === key && !person)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Período" className="flex flex-wrap gap-2">
          {PERIODS.map((value) => (
            <Link
              key={value}
              href={href({ dias: String(value) })}
              aria-current={days === value ? 'page' : undefined}
              className={pill(days === value)}
            >
              {value} dias
            </Link>
          ))}
        </nav>
      </div>

      {person ? (
        <Card title={`Ficha de ${person.name}`}>
          <p className="text-body">
            {person.inExperience ? 'Em experiência (menos de 90 dias na equipe). ' : ''}
            {person.resolved} resolvidos em {person.activeDays}{' '}
            {person.activeDays === 1 ? 'dia ativo' : 'dias ativos'}, primeira resposta em{' '}
            {describeMinutes(person.medianFirstResponse)} (mediana).
          </p>
          <span
            className={cn('w-fit rounded-full px-3 py-1 text-sm font-medium', statusTone(person))}
          >
            {statusLabel(person)}
          </span>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile
              label="Resolvidos"
              value={String(person.resolved)}
              hint={`Equipe: ${current.resolved}`}
            />
            <Tile
              label="1ª resposta"
              value={describeMinutes(person.medianFirstResponse)}
              hint={`Equipe: ${describeMinutes(current.medianFirstResponse)}`}
            />
            <Tile
              label="Sem reabrir"
              value={describeRate(person.noReturn)}
              hint={`Esperado pela mistura de assuntos: ${person.expectedNoReturn === null ? '—' : `${Math.round(person.expectedNoReturn * 100)}%`}`}
            />
            <Tile
              label="Nota"
              value={
                person.rating.average === null
                  ? '—'
                  : person.rating.average.toFixed(1).replace('.', ',')
              }
              hint={`${person.rating.count} avaliações`}
            />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-body font-semibold">Avaliações de 1 a 3</h3>
            {personResolutions.filter((item) => item.rating !== null && item.rating <= 3).length ? (
              <ul className="flex flex-col gap-1 text-body">
                {personResolutions
                  .filter((item) => item.rating !== null && item.rating <= 3)
                  .map((item) => (
                    <li key={item.ticketId + item.at.toISOString()}>
                      Nota {item.rating} ·{' '}
                      {describeTopic(catalog, item.topicId, item.situationId).topic}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-body text-muted-foreground">Nenhuma no período.</p>
            )}
          </div>
          <Link
            href={href({ pessoa: '' })}
            className="inline-flex min-h-11 items-center text-body font-semibold text-link hover:underline"
          >
            Voltar pra equipe
          </Link>
        </Card>
      ) : null}

      {!person && section === 'geral' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile
              label="Resolvidos"
              value={String(current.resolved)}
              hint={`${days} dias`}
              delta={previousLabel(current.resolved, before.resolved, String)}
            />
            <Tile
              label="Primeira resposta"
              value={describeMinutes(current.medianFirstResponse)}
              hint={`Mediana, em horas de atendimento · no prazo: ${rateHint(current.onTime)}`}
              delta={previousLabel(
                current.medianFirstResponse,
                before.medianFirstResponse,
                describeMinutes,
              )}
            />
            <Tile
              label="Sem reabrir"
              value={describeRate(current.noReturn)}
              hint={rateHint(current.noReturn)}
              delta={previousLabel(
                current.noReturn.value,
                before.noReturn.value,
                (value) => `${Math.round(value * 100)}%`,
              )}
            />
            <Tile
              label="Nota"
              value={
                current.rating.average === null
                  ? '—'
                  : current.rating.average.toFixed(1).replace('.', ',')
              }
              hint={`${current.rating.count} avaliações · taxa de avaliação ${describeRate(current.rating.rateOfRating)}`}
            />
          </div>
          <Card title="Gráfico">
            <nav aria-label="Vista do gráfico" className="flex flex-wrap gap-2">
              {CHARTS.map(([key, label]) => (
                <Link
                  key={key}
                  href={href({ grafico: key })}
                  aria-current={chart === key ? 'page' : undefined}
                  className={pill(chart === key)}
                >
                  {label}
                </Link>
              ))}
            </nav>
            {chart === 'volume' ? (
              <>
                <p className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="size-3 rounded-sm bg-primary" />
                    Entrou
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="size-3 rounded-sm bg-progress" />
                    Saiu (resolvido)
                  </span>
                </p>
                <ul className="flex flex-col gap-2">
                  {series.map((point) => (
                    <li
                      key={point.label}
                      className="grid grid-cols-[8rem_1fr] items-center gap-3 text-sm sm:grid-cols-[10rem_1fr]"
                    >
                      <span className="text-muted-foreground">{point.label}</span>
                      <span className="flex flex-col gap-1">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-3 rounded-sm bg-primary"
                            style={{ width: `${(point.entered / maxVolume) * 100}%` }}
                          />{' '}
                          <span className="tabular-nums">{point.entered}</span>
                          <span className="sr-only"> entraram</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-3 rounded-sm bg-progress"
                            style={{ width: `${(point.left / maxVolume) * 100}%` }}
                          />{' '}
                          <span className="tabular-nums">{point.left}</span>
                          <span className="sr-only"> resolvidos</span>
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {chart === 'resposta' ? (
              <ul className="flex flex-col gap-2">
                {responseSeries.map((point) => (
                  <li
                    key={point.label}
                    className="grid grid-cols-[8rem_1fr] items-center gap-3 text-sm sm:grid-cols-[10rem_1fr]"
                  >
                    <span className="text-muted-foreground">{point.label}</span>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 rounded-sm bg-primary"
                        style={{ width: `${((point.value ?? 0) / maxResponse) * 100}%` }}
                      />
                      <span className="tabular-nums">{describeMinutes(point.value)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {chart === 'horarios' ? (
              <div className="overflow-x-auto">
                <table className="border-collapse text-sm">
                  <caption className="sr-only">
                    Chamados que chegaram por dia da semana e hora (Brasília)
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="px-1 py-1 text-left font-semibold">
                        Dia
                      </th>
                      {Array.from({ length: 24 }, (_, hour) => (
                        <th
                          key={hour}
                          scope="col"
                          className="px-1 py-1 font-normal text-muted-foreground"
                        >
                          {hour}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {map.cells.map((row, day) => (
                      <tr key={WEEKDAYS[day]}>
                        <th scope="row" className="px-1 py-1 text-left font-semibold">
                          {WEEKDAYS[day]}
                        </th>
                        {row.map((value, hour) => (
                          <td key={hour} className="px-0.5 py-0.5">
                            <span
                              aria-hidden="true"
                              className="block size-6 rounded-sm bg-primary forced-colors:border"
                              style={{ opacity: value ? 0.2 + (value / maxCell) * 0.8 : 0.06 }}
                              title={`${value} chamados`}
                            />
                            <span className="sr-only">{value} chamados</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fora do horário de atendimento: {map.outside} chamados.
                </p>
              </div>
            ) : null}
          </Card>
          <div className="grid gap-6 xl:grid-cols-3">
            <Card title="Assuntos que mais geram chamados">
              {topicRows.length ? (
                <ol className="flex flex-col gap-2 text-body">
                  {topicRows.slice(0, 6).map((row) => {
                    const { topic, situation } = describeTopic(
                      catalog,
                      row.topicId,
                      row.situationId,
                    );
                    return (
                      <li
                        key={`${row.topicId}:${row.situationId}`}
                        className="flex justify-between gap-3"
                      >
                        <span>
                          {topic}
                          {situation ? ` · ${situation}` : ' · Sem detalhe'}
                        </span>
                        <span className="tabular-nums">{row.count}</span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-body text-muted-foreground">Nenhum chamado no período.</p>
              )}
            </Card>
            <Card title="Equipe">
              {team.length ? (
                <ul className="flex flex-col gap-2 text-body">
                  {team.map((member) => (
                    <li
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <Link
                        href={href({ pessoa: member.id })}
                        className="text-link hover:underline"
                      >
                        {member.name}
                      </Link>
                      <span
                        className={cn(
                          'rounded-full px-3 py-1 text-sm font-medium',
                          statusTone(member),
                        )}
                      >
                        {statusLabel(member)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body text-muted-foreground">
                  Ninguém da equipe respondeu no período.
                </p>
              )}
            </Card>
            <Card title="Precisa de você">
              {items.length ? (
                <ul className="flex flex-col gap-2 text-body">
                  {items.map((item) => (
                    <li key={item.text} className="flex gap-2">
                      <AlertTriangle
                        aria-hidden="true"
                        className="mt-0.5 size-5 shrink-0 text-link"
                      />
                      {item.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body text-muted-foreground">Nada pedindo atenção agora.</p>
              )}
            </Card>
          </div>
          <Card title="Cliques no WhatsApp por assunto">
            <p className="text-sm text-muted-foreground">
              Conta só os cliques feitos nas telas de suporte e no login.
            </p>
            <ul className="flex flex-col gap-1 text-body">
              {SUPPORT_TOPICS.map((topic) => {
                const total = data.clicks
                  .filter((row) => row.topic === topic.id)
                  .reduce((sum, row) => sum + row.total, 0);
                return (
                  <li key={topic.id} className="flex justify-between gap-3">
                    <span>
                      {topic.title} · {topic.name}
                    </span>
                    <span className="tabular-nums">{total}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      ) : null}

      {!person && section === 'equipe' ? (
        <Card title="Equipe">
          <p className="text-sm text-muted-foreground">
            Sem posição: cada pessoa é comparada com o esperado pra mistura de assuntos dela. Com
            menos de {MIN_SAMPLE} resolvidos, sem julgamento. A Ouvidoria fica de fora.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-body tabular-nums">
              <caption className="sr-only">Desempenho de cada pessoa da equipe</caption>
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
                  {[
                    'Pessoa',
                    'Situação',
                    'Resolvidos',
                    'Por dia ativo',
                    '1ª resposta',
                    'No prazo',
                    'Sem reabrir (esperado)',
                    'Nota',
                    'Com a pessoa',
                  ].map((label) => (
                    <th key={label} scope="col" className="px-3 py-3 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {team.map((member) => (
                  <tr key={member.id} className="border-b border-border">
                    <td className="px-3 py-3">
                      <Link
                        href={href({ pessoa: member.id })}
                        className="text-link hover:underline"
                      >
                        {member.name}
                      </Link>
                      {member.inExperience ? (
                        <span className="block text-sm text-muted-foreground">em experiência</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'rounded-full px-3 py-1 text-sm font-medium',
                          statusTone(member),
                        )}
                      >
                        {statusLabel(member)}
                      </span>
                    </td>
                    <td className="px-3 py-3">{member.resolved}</td>
                    <td className="px-3 py-3">
                      {member.perActiveDay === null
                        ? '—'
                        : member.perActiveDay.toFixed(1).replace('.', ',')}
                    </td>
                    <td className="px-3 py-3">{describeMinutes(member.medianFirstResponse)}</td>
                    <td className="px-3 py-3" title={rateHint(member.onTime)}>
                      {describeRate(member.onTime)}
                    </td>
                    <td className="px-3 py-3" title={rateHint(member.noReturn)}>
                      {describeRate(member.noReturn)} (
                      {member.expectedNoReturn === null
                        ? '—'
                        : `${Math.round(member.expectedNoReturn * 100)}%`}
                      )
                    </td>
                    <td className="px-3 py-3">
                      {member.rating.average === null
                        ? '—'
                        : `${member.rating.average.toFixed(1).replace('.', ',')} (${member.rating.count})`}
                    </td>
                    <td className="px-3 py-3">{member.withPerson}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="px-3 py-3">Equipe</td>
                  <td className="px-3 py-3 text-muted-foreground">—</td>
                  <td className="px-3 py-3">{current.resolved}</td>
                  <td className="px-3 py-3 text-muted-foreground">—</td>
                  <td className="px-3 py-3">{describeMinutes(current.medianFirstResponse)}</td>
                  <td className="px-3 py-3">{describeRate(current.onTime)}</td>
                  <td className="px-3 py-3">{describeRate(current.noReturn)}</td>
                  <td className="px-3 py-3">
                    {current.rating.average === null
                      ? '—'
                      : current.rating.average.toFixed(1).replace('.', ',')}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {!person && section === 'assuntos' ? (
        <Card title="Assuntos">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-body tabular-nums">
              <caption className="sr-only">Chamados por tema e situação</caption>
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
                  {[
                    'Tema e situação',
                    'Chamados',
                    'Antes',
                    'Até resolver',
                    'Sem reabrir',
                    'Nota',
                  ].map((label) => (
                    <th key={label} scope="col" className="px-3 py-3 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topicRows.map((row) => {
                  const { topic, situation } = describeTopic(catalog, row.topicId, row.situationId);
                  return (
                    <tr
                      key={`${row.topicId}:${row.situationId}`}
                      className="border-b border-border"
                    >
                      <td className="px-3 py-3">
                        {topic} ·{' '}
                        {row.situationId === OTHER_ISSUE_ID
                          ? 'Outro problema'
                          : (situation ?? 'Sem detalhe')}
                      </td>
                      <td className="px-3 py-3">{row.count}</td>
                      <td className="px-3 py-3">{row.previous}</td>
                      <td className="px-3 py-3">{describeMinutes(row.untilResolved)}</td>
                      <td className="px-3 py-3" title={rateHint(row.noReturn)}>
                        {row.noReturn.total >= MIN_SAMPLE
                          ? describeRate(row.noReturn)
                          : 'poucos chamados'}
                      </td>
                      <td className="px-3 py-3">
                        {row.rating === null ? '—' : row.rating.toFixed(1).replace('.', ',')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <h3 className="text-body font-semibold">Respostas automáticas</h3>
          {data.faq.length ? (
            <ul className="flex flex-col gap-1 text-body">
              {data.faq.map((row) => (
                <li key={row.title} className="flex justify-between gap-3">
                  <span>{row.title}</span>
                  <span className="tabular-nums">
                    resolveu {row.resolved} de {row.total}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-muted-foreground">
              Nenhuma resposta automática usada no período.
            </p>
          )}
        </Card>
      ) : null}
    </AdminPage>
  );
}
