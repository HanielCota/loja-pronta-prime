import { brasiliaDate, brasiliaHour, brasiliaWeekday, supportMinutesBetween, type SupportSchedule } from '@/features/support/support-hours';
import type { TicketPriority } from '@/features/support/ticket-rules';

/**
 * As regras do Desempenho do suporte (do SellBridge, adaptadas). Três perguntas, nesta ordem: a
 * equipe dá conta? resolve de verdade? quem precisa de apoio, e em quê? E: do que as alunas mais
 * reclamam? Tudo medido em horas de atendimento, a mesma régua do prazo.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const RETURN_WINDOW_MS = 7 * DAY_MS;
export const MIN_SAMPLE = 5;
export const EXPERIENCE_DAYS = 90;

export type PerfTicket = {
  id: string;
  requesterId: string | null;
  topicId: string;
  situationId: string | null;
  priority: TicketPriority;
  queue: 'general' | 'ombudsman';
  createdAt: Date;
  firstResponseAt: Date | null;
  lessonId: string | null;
  storePhase: number | null;
  status: 'open' | 'answered' | 'closed';
  assigneeId: string | null;
  dueAt: Date | null;
};

export type PerfEvent = {
  ticketId: string;
  type: 'status_changed' | 'rated';
  fromValue: string | null;
  toValue: string | null;
  createdAt: Date;
};

export type PerfMessage = { ticketId: string; authorId: string | null; createdAt: Date };

export type PerfStaff = { id: string; name: string; joinedAt: Date };

export type PerfInput = {
  from: Date;
  to: Date;
  /** Chamados do período e de antes (pra saber se voltou e quem resolveu). */
  tickets: readonly PerfTicket[];
  events: readonly PerfEvent[];
  /** Respostas públicas da equipe. */
  staffMessages: readonly PerfMessage[];
  staff: readonly PerfStaff[];
  schedule: SupportSchedule;
  deadlineMinutes: Record<TicketPriority, number>;
  now: Date;
};

export type Resolution = {
  ticketId: string;
  at: Date;
  resolverId: string | null;
  topicId: string;
  situationId: string | null;
  returned: boolean;
  rating: number | null;
};

const inPeriod = (moment: Date, from: Date, to: Date) => moment.getTime() >= from.getTime() && moment.getTime() < to.getTime();

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[middle] ?? null) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function situationKey(topicId: string, situationId: string | null) {
  return `${topicId}:${situationId ?? ''}`;
}

/** Mesmo assunto de verdade: mesma aula ou mesma fase (sem referência em comum, não conta). */
function sameSubject(a: PerfTicket, b: PerfTicket): boolean {
  if (a.lessonId && a.lessonId === b.lessonId) return true;
  return a.storePhase !== null && a.storePhase === b.storePhase;
}

/**
 * Cada encerramento no período, com quem resolveu (autor da última resposta pública da equipe antes
 * do encerramento, também no automático), se voltou em 7 dias e a nota daquele encerramento.
 */
export function resolutions(input: PerfInput): Resolution[] {
  const ticketById = new Map(input.tickets.map((ticket) => [ticket.id, ticket]));
  const closes = input.events.filter((event) => event.type === 'status_changed' && event.toValue === 'closed');
  return closes
    .filter((event) => inPeriod(event.createdAt, input.from, input.to))
    .flatMap((close) => {
      const ticket = ticketById.get(close.ticketId);
      if (!ticket || ticket.queue === 'ombudsman') return [];
      const resolver =
        input.staffMessages
          .filter((message) => message.ticketId === ticket.id && message.createdAt.getTime() <= close.createdAt.getTime())
          .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.authorId ?? null;
      const reopened = input.events.some(
        (event) =>
          event.ticketId === ticket.id &&
          event.type === 'status_changed' &&
          event.fromValue === 'closed' &&
          event.createdAt.getTime() > close.createdAt.getTime() &&
          event.createdAt.getTime() - close.createdAt.getTime() <= RETURN_WINDOW_MS,
      );
      const repeated = input.tickets.some(
        (other) =>
          other.id !== ticket.id &&
          other.requesterId !== null &&
          other.requesterId === ticket.requesterId &&
          situationKey(other.topicId, other.situationId) === situationKey(ticket.topicId, ticket.situationId) &&
          other.createdAt.getTime() > close.createdAt.getTime() &&
          other.createdAt.getTime() - close.createdAt.getTime() <= RETURN_WINDOW_MS &&
          sameSubject(ticket, other),
      );
      const nextClose = closes
        .filter((event) => event.ticketId === ticket.id && event.createdAt.getTime() > close.createdAt.getTime())
        .toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      const rated = input.events.find(
        (event) =>
          event.ticketId === ticket.id &&
          event.type === 'rated' &&
          event.createdAt.getTime() >= close.createdAt.getTime() &&
          (!nextClose || event.createdAt.getTime() < nextClose.createdAt.getTime()),
      );
      return [
        {
          ticketId: ticket.id,
          at: close.createdAt,
          resolverId: resolver,
          topicId: ticket.topicId,
          situationId: ticket.situationId,
          returned: reopened || repeated,
          rating: rated?.toValue ? Number(rated.toValue) : null,
        },
      ];
    });
}

export type FirstResponse = { ticketId: string; minutes: number; onTime: boolean; responderId: string | null };

/** Primeira resposta dos chamados abertos no período, em minutos de atendimento. */
export function firstResponses(input: PerfInput): FirstResponse[] {
  return input.tickets
    .filter((ticket) => ticket.queue === 'general' && ticket.firstResponseAt && inPeriod(ticket.createdAt, input.from, input.to))
    .map((ticket) => {
      const minutes = supportMinutesBetween(ticket.createdAt, ticket.firstResponseAt as Date, input.schedule);
      const responder =
        input.staffMessages
          .filter((message) => message.ticketId === ticket.id)
          .toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]?.authorId ?? null;
      return {
        ticketId: ticket.id,
        minutes,
        onTime: minutes <= (input.deadlineMinutes[ticket.priority] ?? Number.POSITIVE_INFINITY),
        responderId: responder,
      };
    });
}

export type Rate = { value: number | null; count: number; total: number };

function rate(count: number, total: number): Rate {
  return { value: total ? count / total : null, count, total };
}

export type Overview = {
  resolved: number;
  medianFirstResponse: number | null;
  onTime: Rate;
  noReturn: Rate;
  rating: { average: number | null; count: number; rateOfRating: Rate };
};

export function overview(input: PerfInput): Overview {
  const resolved = resolutions(input);
  const responses = firstResponses(input);
  const ratings = resolved.flatMap((item) => (item.rating === null ? [] : [item.rating]));
  return {
    resolved: resolved.length,
    medianFirstResponse: median(responses.map((item) => item.minutes)),
    onTime: rate(responses.filter((item) => item.onTime).length, responses.length),
    noReturn: rate(resolved.filter((item) => !item.returned).length, resolved.length),
    rating: {
      average: ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null,
      count: ratings.length,
      rateOfRating: rate(ratings.length, resolved.length),
    },
  };
}

export type PersonStatus = 'late' | 'small' | 'support' | 'above' | 'average';

export const PERSON_STATUS_LABELS: Readonly<Record<PersonStatus, string>> = {
  late: 'fora do prazo',
  small: 'Poucos chamados',
  support: 'Precisa de apoio',
  above: 'Acima da equipe',
  average: 'Na média',
};

export type PersonRow = {
  id: string;
  name: string;
  inExperience: boolean;
  status: PersonStatus;
  lateNow: number;
  resolved: number;
  activeDays: number;
  perActiveDay: number | null;
  medianFirstResponse: number | null;
  onTime: Rate;
  noReturn: Rate;
  expectedNoReturn: number | null;
  rating: { average: number | null; count: number };
  withPerson: number;
};

/** A taxa de "sem reabrir" da equipe em cada situação (base da comparação justa). */
function teamNoReturnBySituation(resolved: readonly Resolution[]) {
  const map = new Map<string, { ok: number; total: number }>();
  for (const item of resolved) {
    const key = situationKey(item.topicId, item.situationId);
    const current = map.get(key) ?? { ok: 0, total: 0 };
    map.set(key, { ok: current.ok + (item.returned ? 0 : 1), total: current.total + 1 });
  }
  return map;
}

/**
 * A tabela da equipe. Ninguém é comparado com a média geral: o "sem reabrir" de cada pessoa é
 * comparado com o esperado pra mistura de assuntos dela. Sem número de posição.
 */
export function people(input: PerfInput): PersonRow[] {
  const resolved = resolutions(input);
  const responses = firstResponses(input);
  const team = teamNoReturnBySituation(resolved);
  return input.staff
    .map((member) => {
      const mine = resolved.filter((item) => item.resolverId === member.id);
      const myResponses = responses.filter((item) => item.responderId === member.id);
      const days = new Set(
        input.staffMessages
          .filter((message) => message.authorId === member.id && inPeriod(message.createdAt, input.from, input.to))
          .map((message) => brasiliaDate(message.createdAt)),
      );
      const expected = mine.length
        ? mine.reduce((sum, item) => {
            const base = team.get(situationKey(item.topicId, item.situationId));
            return sum + (base && base.total ? base.ok / base.total : 0);
          }, 0) / mine.length
        : null;
      const ratings = mine.flatMap((item) => (item.rating === null ? [] : [item.rating]));
      const onTime = rate(myResponses.filter((item) => item.onTime).length, myResponses.length);
      const noReturn = rate(mine.filter((item) => !item.returned).length, mine.length);
      const lateNow = input.tickets.filter(
        (ticket) =>
          ticket.assigneeId === member.id &&
          ticket.status === 'open' &&
          ticket.dueAt !== null &&
          ticket.dueAt.getTime() < input.now.getTime(),
      ).length;
      return {
        id: member.id,
        name: member.name,
        inExperience: input.now.getTime() - member.joinedAt.getTime() < EXPERIENCE_DAYS * DAY_MS,
        status: personStatus(lateNow, mine.length, onTime.value, noReturn.value, expected),
        lateNow,
        resolved: mine.length,
        activeDays: days.size,
        perActiveDay: days.size ? mine.length / days.size : null,
        medianFirstResponse: median(myResponses.map((item) => item.minutes)),
        onTime,
        noReturn,
        expectedNoReturn: expected,
        rating: {
          average: ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null,
          count: ratings.length,
        },
        withPerson: input.tickets.filter((ticket) => ticket.assigneeId === member.id && ticket.status !== 'closed').length,
      };
    })
    .toSorted((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.name.localeCompare(b.name));
}

const STATUS_ORDER: readonly PersonStatus[] = ['late', 'support', 'small', 'average', 'above'];

export function personStatus(
  lateNow: number,
  resolved: number,
  onTime: number | null,
  noReturn: number | null,
  expected: number | null,
): PersonStatus {
  if (lateNow > 0) return 'late';
  if (resolved < MIN_SAMPLE) return 'small';
  const gap = noReturn !== null && expected !== null ? noReturn - expected : 0;
  if ((onTime !== null && onTime < 0.8) || gap < -0.05) return 'support';
  if (onTime !== null && onTime >= 0.92 && gap >= 0.03) return 'above';
  return 'average';
}

export type VolumePoint = { label: string; entered: number; left: number };

/** Entrou × saiu: por dia em 7 dias, por semana em 30 e 90. */
export function volume(input: PerfInput, days: number): VolumePoint[] {
  const bucketMs = days <= 7 ? DAY_MS : 7 * DAY_MS;
  const buckets = Math.ceil((input.to.getTime() - input.from.getTime()) / bucketMs);
  const resolved = resolutions(input);
  return Array.from({ length: buckets }, (_, index) => {
    const start = new Date(input.from.getTime() + index * bucketMs);
    const end = new Date(Math.min(start.getTime() + bucketMs, input.to.getTime()));
    const day = brasiliaDate(start).split('-').toReversed().slice(0, 2).join('/');
    return {
      label: days <= 7 ? day : `Semana de ${day}`,
      entered: input.tickets.filter((ticket) => ticket.queue === 'general' && inPeriod(ticket.createdAt, start, end)).length,
      left: resolved.filter((item) => inPeriod(item.at, start, end)).length,
    };
  });
}

/** Mapa de horários: chamados que chegaram por dia da semana × hora, mais os de fora do horário. */
export function heatmap(input: PerfInput): { cells: number[][]; outside: number } {
  const cells = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  let outside = 0;
  for (const ticket of input.tickets) {
    if (ticket.queue !== 'general' || !inPeriod(ticket.createdAt, input.from, input.to)) continue;
    const day = brasiliaWeekday(ticket.createdAt);
    const hour = brasiliaHour(ticket.createdAt);
    const window = input.schedule.weekly[day] ?? null;
    const minutes = hour * 60;
    if (!window || minutes < window.opens - 59 || minutes >= window.closes) outside += 1;
    const row = cells[day];
    if (row) row[hour] = (row[hour] ?? 0) + 1;
  }
  return { cells, outside };
}

export type TopicRow = { topicId: string; situationId: string | null; count: number; previous: number; noReturn: Rate; rating: number | null; untilResolved: number | null };

/** Assuntos: tema e situação, com o período anterior, "sem reabrir" e nota. */
export function topics(input: PerfInput, previous: PerfInput): TopicRow[] {
  const resolved = resolutions(input);
  const counts = new Map<string, TopicRow>();
  for (const ticket of input.tickets) {
    if (ticket.queue !== 'general' || !inPeriod(ticket.createdAt, input.from, input.to)) continue;
    const key = situationKey(ticket.topicId, ticket.situationId);
    const row = counts.get(key) ?? { topicId: ticket.topicId, situationId: ticket.situationId, count: 0, previous: 0, noReturn: rate(0, 0), rating: null, untilResolved: null };
    counts.set(key, { ...row, count: row.count + 1 });
  }
  for (const ticket of previous.tickets) {
    if (ticket.queue !== 'general' || !inPeriod(ticket.createdAt, previous.from, previous.to)) continue;
    const key = situationKey(ticket.topicId, ticket.situationId);
    const row = counts.get(key);
    if (row) counts.set(key, { ...row, previous: row.previous + 1 });
  }
  return [...counts.entries()]
    .map(([key, row]) => {
      const mine = resolved.filter((item) => situationKey(item.topicId, item.situationId) === key);
      const ratings = mine.flatMap((item) => (item.rating === null ? [] : [item.rating]));
      const durations = mine.flatMap((item) => {
        const ticket = input.tickets.find((candidate) => candidate.id === item.ticketId);
        return ticket ? [supportMinutesBetween(ticket.createdAt, item.at, input.schedule)] : [];
      });
      return {
        ...row,
        noReturn: rate(mine.filter((item) => !item.returned).length, mine.length),
        rating: ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null,
        untilResolved: median(durations),
      };
    })
    .toSorted((a, b) => b.count - a.count);
}

export type Attention = { kind: 'late' | 'unassigned' | 'spike' | 'person' | 'other-issue' | 'faq'; text: string };

/** "Precisa de você": o que a coordenação olha primeiro. */
export function attention(
  input: PerfInput,
  previous: PerfInput,
  options: {
    unassigned: number;
    topicLabel: (id: string) => string;
    faqStillNeedHelp: { title: string; ratio: number; total: number }[];
  },
): Attention[] {
  const items: Attention[] = [];
  const late = input.tickets.filter((ticket) => ticket.status === 'open' && ticket.dueAt && ticket.dueAt.getTime() < input.now.getTime()).length;
  if (late) items.push({ kind: 'late', text: `${late} ${late === 1 ? 'chamado fora do prazo' : 'chamados fora do prazo'} agora` });
  if (options.unassigned) items.push({ kind: 'unassigned', text: `${options.unassigned} ${options.unassigned === 1 ? 'chamado sem responsável' : 'chamados sem responsável'}` });
  const byTopic = (source: PerfInput) => {
    const map = new Map<string, number>();
    for (const ticket of source.tickets)
      if (ticket.queue === 'general' && inPeriod(ticket.createdAt, source.from, source.to)) map.set(ticket.topicId, (map.get(ticket.topicId) ?? 0) + 1);
    return map;
  };
  const now = byTopic(input);
  const before = byTopic(previous);
  for (const [topicId, count] of now) {
    const old = before.get(topicId) ?? 0;
    if (count - old >= 3 && count >= old * 1.5)
      items.push({ kind: 'spike', text: `${options.topicLabel(topicId)} disparou: ${count} chamados (antes, ${old})` });
    const other = input.tickets.filter(
      (ticket) => ticket.topicId === topicId && ticket.situationId === 'other-issue' && inPeriod(ticket.createdAt, input.from, input.to),
    ).length;
    if (count >= MIN_SAMPLE && other / count >= 0.2)
      items.push({ kind: 'other-issue', text: `${options.topicLabel(topicId)}: ${Math.round((other / count) * 100)}% caem em “Outro problema”. Vale criar uma situação nova.` });
  }
  for (const person of people(input))
    if (person.status === 'support') items.push({ kind: 'person', text: `${person.name} precisa de apoio` });
  for (const faq of options.faqStillNeedHelp)
    if (faq.total >= MIN_SAMPLE && faq.ratio >= 0.6)
      items.push({ kind: 'faq', text: `A resposta automática “${faq.title}” não resolve ${Math.round(faq.ratio * 100)}% das vezes` });
  return items;
}

/** "82% de 17" na dica; sem amostra mínima, "poucos chamados". */
export function describeRate(value: Rate): string {
  if (value.value === null) return '—';
  return `${Math.round(value.value * 100)}%`;
}

export function describeMinutes(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  return `${hours.toFixed(hours < 10 ? 1 : 0).replace('.', ',')} h`;
}
