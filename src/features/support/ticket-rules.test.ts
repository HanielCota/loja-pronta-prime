import { describe, expect, test } from 'bun:test';
import {
  afterRequesterMessage,
  afterStaffReply,
  canAssign,
  closesAutomatically,
  autoCloseCutoff,
  autoCloseDate,
  deadlineBadge,
  isOverdue,
  rates,
  requesterCloses,
  responseTiming,
  responseWindowUsed,
  staffChangesStatus,
  type TicketState,
} from './ticket-rules';
import { DEFAULT_WEEKLY_HOURS, type SupportSchedule } from './support-hours';

const now = new Date('2026-10-26T13:00:00Z');
const earlier = new Date('2026-10-26T11:00:00Z');

const open: TicketState = {
  status: 'open',
  assigneeId: null,
  awaitingSince: earlier,
  firstResponseAt: null,
  closedAt: null,
  closedReason: null,
  rating: null,
};

describe('mensagem da aluna', () => {
  test('mantém o relógio já ligado', () => {
    const result = afterRequesterMessage(open, now);
    expect(result.ok && result.patch.awaitingSince).toEqual(earlier);
    expect(result.ok && result.events).toEqual([]);
  });

  test('reabre o encerrado e limpa a avaliação', () => {
    const closed: TicketState = { ...open, status: 'closed', awaitingSince: null, rating: 4, closedAt: earlier };
    const result = afterRequesterMessage(closed, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.patch).toMatchObject({ status: 'open', awaitingSince: now, rating: null, closedAt: null });
    expect(result.events).toEqual([{ type: 'status_changed', from: 'closed', to: 'open' }]);
  });
});

describe('resposta da equipe', () => {
  test('zera o relógio, grava a primeira resposta e assume o chamado sem responsável', () => {
    const result = afterStaffReply(open, { actorId: 'ana', assigneeActive: false, statusAfter: 'answered', now });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.patch).toMatchObject({ status: 'answered', awaitingSince: null, firstResponseAt: now, assigneeId: 'ana' });
    expect(result.events).toEqual([
      { type: 'assigned', from: null, to: 'ana' },
      { type: 'status_changed', from: 'open', to: 'answered' },
    ]);
  });

  test('"manter aguardando" também para o relógio', () => {
    const result = afterStaffReply(
      { ...open, assigneeId: 'ana' },
      { actorId: 'ana', assigneeActive: true, statusAfter: 'open', now },
    );
    expect(result.ok && result.patch.awaitingSince).toBeNull();
    expect(result.ok && result.events).toEqual([]);
  });

  test('não tira o chamado da responsável ativa', () => {
    const result = afterStaffReply(
      { ...open, assigneeId: 'bia' },
      { actorId: 'ana', assigneeActive: true, statusAfter: 'answered', now },
    );
    expect(result.ok && 'assigneeId' in result.patch).toBe(false);
  });

  test('assume quando a responsável saiu da equipe', () => {
    const result = afterStaffReply(
      { ...open, assigneeId: 'bia' },
      { actorId: 'ana', assigneeActive: false, statusAfter: 'answered', now },
    );
    expect(result.ok && result.patch.assigneeId).toBe('ana');
  });

  test('responder e encerrar grava o motivo', () => {
    const result = afterStaffReply(open, { actorId: 'ana', assigneeActive: false, statusAfter: 'closed', now });
    expect(result.ok && result.patch).toMatchObject({ closedAt: now, closedReason: 'staff' });
  });

  test('recusa responder encerrado', () => {
    const result = afterStaffReply(
      { ...open, status: 'closed' },
      { actorId: 'ana', assigneeActive: false, statusAfter: 'answered', now },
    );
    expect(result).toEqual({ ok: false, status: 409, message: 'Reabra o chamado antes de responder.' });
  });
});

describe('status sem mensagem', () => {
  test('não deixa marcar respondido escondido', () => {
    expect(staffChangesStatus(open, 'answered', now).ok).toBe(false);
  });

  test('reabrir liga o relógio de novo', () => {
    const closed: TicketState = { ...open, status: 'closed', awaitingSince: null };
    const result = staffChangesStatus(closed, 'open', now);
    expect(result.ok && result.patch.awaitingSince).toEqual(now);
  });

  test('encerrar zera o relógio', () => {
    const result = staffChangesStatus(open, 'closed', now);
    expect(result.ok && result.patch).toMatchObject({ awaitingSince: null, closedReason: 'staff' });
  });
});

describe('aluna encerra e avalia', () => {
  test('encerra e não encerra duas vezes', () => {
    expect(requesterCloses(open, now).ok).toBe(true);
    expect(requesterCloses({ ...open, status: 'closed' }, now)).toEqual({
      ok: false,
      status: 409,
      message: 'Este chamado já está encerrado.',
    });
  });

  test('avalia uma vez, só encerrado, de 1 a 5', () => {
    const closed: TicketState = { ...open, status: 'closed' };
    expect(rates(open, 5, '', now).ok).toBe(false);
    expect(rates(closed, 6, '', now).ok).toBe(false);
    expect(rates({ ...closed, rating: 4 }, 5, '', now).ok).toBe(false);
    const result = rates(closed, 5, '  Ótimo  ', now);
    expect(result.ok && result.patch).toMatchObject({ rating: 5, ratingComment: 'Ótimo' });
  });

  test('só encerra sozinho o que está respondido', () => {
    expect(closesAutomatically(open, now).ok).toBe(false);
    const result = closesAutomatically({ ...open, status: 'answered', awaitingSince: null }, now);
    expect(result.ok && result.patch.closedReason).toBe('automatic');
  });
});

describe('responsável', () => {
  test('atendente assume chamado livre e devolve o próprio', () => {
    expect(canAssign({ actorId: 'ana', canAssignOthers: false, activeAssigneeId: null, targetId: 'ana' }).ok).toBe(true);
    expect(canAssign({ actorId: 'ana', canAssignOthers: false, activeAssigneeId: 'ana', targetId: null }).ok).toBe(true);
  });

  test('atendente não passa chamado de outra pessoa', () => {
    expect(canAssign({ actorId: 'ana', canAssignOthers: false, activeAssigneeId: 'bia', targetId: 'ana' })).toEqual({
      ok: false,
      message: 'Só supervisores podem passar chamados de outra pessoa.',
    });
    expect(canAssign({ actorId: 'ana', canAssignOthers: false, activeAssigneeId: null, targetId: 'bia' }).ok).toBe(false);
  });

  test('supervisor passa pra qualquer pessoa', () => {
    expect(canAssign({ actorId: 'sup', canAssignOthers: true, activeAssigneeId: 'bia', targetId: 'ana' }).ok).toBe(true);
  });
});

const waiting = (dueAt: Date | null) => ({ status: 'open' as const, awaitingSince: earlier, dueAt });

describe('prazo', () => {
  test('atrasado só aguardando e depois do prazo', () => {
    expect(isOverdue(waiting(earlier), now)).toBe(true);
    expect(isOverdue({ ...waiting(earlier), status: 'answered' }, now)).toBe(false);
    expect(isOverdue(waiting(null), now)).toBe(false);
  });

  test('"manter aguardando" para o relógio: aberto, mas sem prazo correndo', () => {
    expect(responseTiming({ status: 'open', awaitingSince: null, dueAt: earlier }, now)).toEqual({ state: 'none' });
  });

  test('no prazo diz quanto falta; atrasado diz quanto passou', () => {
    expect(responseTiming(waiting(new Date(now.getTime() + 60_000)), now)).toEqual({ state: 'on_time', remainingMs: 60_000 });
    expect(responseTiming(waiting(new Date(now.getTime() - 60_000)), now)).toEqual({ state: 'overdue', lateMs: 60_000 });
    expect(responseTiming({ ...waiting(earlier), status: 'closed' }, now)).toEqual({ state: 'none' });
  });

  test('selo do prazo', () => {
    expect(deadlineBadge(waiting(new Date(now.getTime() + 3 * 3_600_000)), now)).toEqual({
      label: 'Vence em 3 h',
      tone: 'calm',
    });
    expect(deadlineBadge(waiting(new Date(now.getTime() + 40 * 60_000)), now)).toEqual({
      label: 'Vence em 40 min',
      tone: 'soon',
    });
    expect(deadlineBadge(waiting(new Date(now.getTime() - 40 * 60_000)), now)).toEqual({
      label: 'Atrasado 40 min',
      tone: 'late',
    });
    expect(deadlineBadge({ ...waiting(earlier), status: 'answered' }, now)).toBeNull();
  });
});

describe('barra do tempo usado', () => {
  const schedule: SupportSchedule = { weekly: DEFAULT_WEEKLY_HOURS, holidays: [], pausedUntil: null };
  // Segunda 26/10, 10h em Brasília, com prazo de 4 horas de atendimento: 14h.
  const since = new Date('2026-10-26T13:00:00Z');
  const ticket = { status: 'open' as const, awaitingSince: since, dueAt: new Date('2026-10-26T17:00:00Z') };

  test('metade do prazo é metade da barra', () => {
    expect(responseWindowUsed(ticket, new Date('2026-10-26T15:00:00Z'), schedule)).toBe(0.5);
  });

  test('fica entre 0 e 1, e cheia depois do prazo', () => {
    expect(responseWindowUsed(ticket, new Date('2026-10-26T12:00:00Z'), schedule)).toBe(0);
    expect(responseWindowUsed(ticket, new Date('2026-10-27T13:00:00Z'), schedule)).toBe(1);
  });

  test('fora do horário de atendimento a barra não anda', () => {
    // Prazo de 2 h que começou às 17h: 1 h na segunda e 1 h na terça, a partir das 8h.
    const evening = {
      status: 'open' as const,
      awaitingSince: new Date('2026-10-26T20:00:00Z'),
      dueAt: new Date('2026-10-27T12:00:00Z'),
    };
    const atNight = responseWindowUsed(evening, new Date('2026-10-27T03:00:00Z'), schedule);
    const beforeOpening = responseWindowUsed(evening, new Date('2026-10-27T10:59:00Z'), schedule);
    expect(atNight).toBe(0.5);
    expect(beforeOpening).toBe(0.5);
  });

  test('sem prazo correndo fica vazia', () => {
    expect(responseWindowUsed({ ...ticket, status: 'answered' }, now, schedule)).toBe(0);
  });
});

describe('encerramento automático', () => {
  const reply = new Date('2026-10-20T15:00:00Z');

  test('conta os dias a partir da última resposta pública', () => {
    expect(autoCloseDate({ status: 'answered', awaitingSince: null, lastStaffReplyAt: reply }, 7)).toEqual(
      new Date('2026-10-27T15:00:00Z'),
    );
  });

  test('só respondido e sem nada devido encerra sozinho', () => {
    expect(autoCloseDate({ status: 'open', awaitingSince: null, lastStaffReplyAt: reply }, 7)).toBeNull();
    expect(autoCloseDate({ status: 'answered', awaitingSince: reply, lastStaffReplyAt: reply }, 7)).toBeNull();
    expect(autoCloseDate({ status: 'answered', awaitingSince: null, lastStaffReplyAt: null }, 7)).toBeNull();
  });

  test('o corte do job bate com a data prometida', () => {
    const closesAt = autoCloseDate({ status: 'answered', awaitingSince: null, lastStaffReplyAt: reply }, 7);
    expect(autoCloseCutoff(closesAt ?? now, 7)).toEqual(reply);
  });
});
