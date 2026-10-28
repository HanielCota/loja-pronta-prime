import { describe, expect, test } from 'bun:test';
import { DEFAULT_WEEKLY_HOURS } from '@/features/support/support-hours';
import {
  attention,
  firstResponses,
  heatmap,
  median,
  overview,
  people,
  personStatus,
  resolutions,
  type PerfEvent,
  type PerfInput,
  type PerfTicket,
} from './performance';

const at = (value: string) => new Date(`${value}-03:00`);

function ticket(id: string, overrides: Partial<PerfTicket> = {}): PerfTicket {
  return {
    id,
    requesterId: 'aluna-1',
    topicId: 'lessons',
    situationId: 'video-not-loading',
    priority: 'normal',
    queue: 'general',
    createdAt: at('2026-10-20T09:00:00'),
    firstResponseAt: at('2026-10-20T10:00:00'),
    lessonId: 'aula-5',
    storePhase: null,
    status: 'closed',
    assigneeId: 'ana',
    dueAt: null,
    ...overrides,
  };
}

const close = (ticketId: string, when: string, automatic = false): PerfEvent => ({
  ticketId,
  type: 'status_changed',
  fromValue: automatic ? 'answered' : 'answered',
  toValue: 'closed',
  createdAt: at(when),
});

function input(overrides: Partial<PerfInput> = {}): PerfInput {
  return {
    from: at('2026-10-19T00:00:00'),
    to: at('2026-10-26T00:00:00'),
    tickets: [ticket('t1')],
    events: [close('t1', '2026-10-20T11:00:00')],
    staffMessages: [{ ticketId: 't1', authorId: 'ana', createdAt: at('2026-10-20T10:00:00') }],
    staff: [{ id: 'ana', name: 'Ana', joinedAt: at('2025-01-01T00:00:00') }],
    schedule: { weekly: DEFAULT_WEEKLY_HOURS, holidays: [], pausedUntil: null },
    deadlineMinutes: { urgent: 120, high: 240, normal: 480, low: 960 },
    now: at('2026-10-26T10:00:00'),
    ...overrides,
  };
}

describe('quem resolveu e se voltou', () => {
  test('quem resolveu é o autor da última resposta pública antes do encerramento', () => {
    const result = resolutions(
      input({
        staffMessages: [
          { ticketId: 't1', authorId: 'ana', createdAt: at('2026-10-20T10:00:00') },
          { ticketId: 't1', authorId: 'bia', createdAt: at('2026-10-20T10:30:00') },
        ],
      }),
    );
    expect(result[0]?.resolverId).toBe('bia');
  });

  test('reaberto em até 7 dias conta como voltou', () => {
    const result = resolutions(
      input({
        events: [
          close('t1', '2026-10-20T11:00:00'),
          {
            ticketId: 't1',
            type: 'status_changed',
            fromValue: 'closed',
            toValue: 'open',
            createdAt: at('2026-10-22T09:00:00'),
          },
        ],
      }),
    );
    expect(result[0]?.returned).toBe(true);
  });

  test('chamado novo da mesma aluna, mesma situação e mesma aula conta como voltou', () => {
    const result = resolutions(
      input({
        tickets: [
          ticket('t1'),
          ticket('t2', { createdAt: at('2026-10-23T09:00:00'), status: 'open' }),
        ],
      }),
    );
    expect(result[0]?.returned).toBe(true);
  });

  test('outra aula não conta (pode ser outro problema)', () => {
    const result = resolutions(
      input({
        tickets: [
          ticket('t1'),
          ticket('t2', {
            createdAt: at('2026-10-23T09:00:00'),
            lessonId: 'aula-9',
            status: 'open',
          }),
        ],
      }),
    );
    expect(result[0]?.returned).toBe(false);
  });

  test('a nota vai pra quem resolveu aquele encerramento', () => {
    const result = resolutions(
      input({
        events: [
          close('t1', '2026-10-20T11:00:00'),
          {
            ticketId: 't1',
            type: 'rated',
            fromValue: null,
            toValue: '4',
            createdAt: at('2026-10-20T12:00:00'),
          },
        ],
      }),
    );
    expect(result[0]?.rating).toBe(4);
  });

  test('Ouvidoria fica fora das medidas por pessoa', () => {
    expect(resolutions(input({ tickets: [ticket('t1', { queue: 'ombudsman' })] }))).toEqual([]);
  });
});

describe('primeira resposta', () => {
  test('mede em horas de atendimento e confere o prazo da prioridade', () => {
    // Aberto sexta 17h, respondido segunda 9h: 1h na sexta + 4h no sábado + 1h na segunda = 6h.
    const result = firstResponses(
      input({
        tickets: [
          ticket('t1', {
            createdAt: at('2026-10-23T17:00:00'),
            firstResponseAt: at('2026-10-26T09:00:00'),
          }),
        ],
        from: at('2026-10-19T00:00:00'),
        to: at('2026-10-27T00:00:00'),
      }),
    );
    expect(result[0]?.minutes).toBe(6 * 60);
    expect(result[0]?.onTime).toBe(true);
  });

  test('mediana', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('situação da pessoa', () => {
  test('ordem: fora do prazo, poucos chamados, precisa de apoio, acima, na média', () => {
    expect(personStatus(2, 50, 1, 1, 0.5)).toBe('late');
    expect(personStatus(0, 3, 1, 1, 0.5)).toBe('small');
    expect(personStatus(0, 10, 0.7, 0.9, 0.9)).toBe('support');
    expect(personStatus(0, 10, 0.95, 0.95, 0.9)).toBe('above');
    expect(personStatus(0, 10, 0.9, 0.9, 0.9)).toBe('average');
  });

  test('com poucos chamados, sem cor nem julgamento', () => {
    const [ana] = people(input());
    expect(ana?.status).toBe('small');
    expect(ana?.resolved).toBe(1);
    expect(ana?.activeDays).toBe(1);
  });
});

describe('visão geral e atenção', () => {
  test('resumo com taxa de avaliação', () => {
    const result = overview(input());
    expect(result.resolved).toBe(1);
    expect(result.noReturn.value).toBe(1);
    expect(result.rating.rateOfRating.value).toBe(0);
  });

  test('chamado atrasado aparece em "Precisa de você"', () => {
    const items = attention(
      input({ tickets: [ticket('t1', { status: 'open', dueAt: at('2026-10-26T09:00:00') })] }),
      input({ tickets: [] }),
      { unassigned: 0, topicLabel: (id) => id, faqStillNeedHelp: [] },
    );
    expect(items[0]).toEqual({ kind: 'late', text: '1 chamado fora do prazo agora' });
  });

  test('mapa de horários separa o que chegou fora do horário', () => {
    const result = heatmap(
      input({
        tickets: [
          ticket('t1', { createdAt: at('2026-10-20T23:00:00') }),
          ticket('t2', { createdAt: at('2026-10-20T10:00:00') }),
        ],
      }),
    );
    expect(result.outside).toBe(1);
    expect(result.cells[2]?.[10]).toBe(1);
  });
});

test('unsorted timelines keep stable message ties and ratings in their closing window', () => {
  const first = close('t1', '2026-10-20T11:00:00');
  const second = close('t1', '2026-10-22T11:00:00');
  const rated = (value: string, when: string): PerfEvent => ({
    ticketId: 't1',
    type: 'rated',
    fromValue: null,
    toValue: value,
    createdAt: at(when),
  });
  const result = resolutions(
    input({
      events: [
        second,
        rated('2', '2026-10-22T11:00:00'),
        rated('4', '2026-10-21T11:00:00'),
        first,
        rated('5', '2026-10-20T12:00:00'),
      ],
      staffMessages: [
        { ticketId: 't1', authorId: 'first-tie', createdAt: at('2026-10-20T10:00:00') },
        { ticketId: 't1', authorId: 'second-tie', createdAt: at('2026-10-20T10:00:00') },
        { ticketId: 't1', authorId: 'later', createdAt: at('2026-10-22T10:00:00') },
      ],
    }),
  );
  expect(result.map((row) => [row.resolverId, row.rating])).toEqual([
    ['later', 2],
    ['first-tie', 4],
  ]);
});

test('repeat matching includes the seven-day boundary and either shared subject', () => {
  const base = input({
    tickets: [
      ticket('t1', { storePhase: 3 }),
      ticket('t2', {
        createdAt: at('2026-10-27T11:00:00'),
        lessonId: 'different-lesson',
        storePhase: 3,
      }),
    ],
  });
  expect(resolutions(base)[0]?.returned).toBe(true);
  base.tickets = [base.tickets[0]!, { ...base.tickets[1]!, createdAt: at('2026-10-27T11:00:01') }];
  expect(resolutions(base)[0]?.returned).toBe(false);
});

test('ten thousand resolutions read the message collection linearly', () => {
  const count = 10_000;
  const tickets = Array.from({ length: count }, (_, index) =>
    ticket(String(index), { requesterId: `requester-${index}` }),
  );
  const messages = tickets.map((item) => ({
    ticketId: item.id,
    authorId: 'ana',
    createdAt: at('2026-10-20T10:00:00'),
  }));
  let reads = 0;
  const tracked = new Proxy(messages, {
    get(target, key, receiver) {
      if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
      return Reflect.get(target, key, receiver);
    },
  });
  const result = resolutions(
    input({
      tickets,
      staffMessages: tracked,
      events: tickets.map((item) => close(item.id, '2026-10-20T11:00:00')),
    }),
  );
  expect(result).toHaveLength(count);
  expect(result.every((item) => item.resolverId === 'ana' && !item.returned)).toBe(true);
  expect(reads).toBeLessThanOrEqual(count * 2);
});
