import { describe, expect, test } from 'bun:test';
import { customerEventSentence, customerStateLine, responsePromise, staffEventSentence } from './copy';
import { DEFAULT_WEEKLY_HOURS, type SupportSchedule } from './support-hours';

const schedule: SupportSchedule = { weekly: DEFAULT_WEEKLY_HOURS, holidays: [], pausedUntil: null };
const brasilia = (value: string) => new Date(`${value}-03:00`);
const topicLabel = (id: string) => (id === 'lessons' ? 'Aulas do curso' : id);

describe('linha de situação da aluna', () => {
  test('esperando, dentro do horário, mostra o prazo de verdade', () => {
    expect(
      customerStateLine(
        { status: 'open', dueAt: brasilia('2026-10-26T15:30:00'), closedReason: null, lastStaffReplyAt: null },
        brasilia('2026-10-26T10:00:00'),
        schedule,
        7,
      ),
    ).toBe('O suporte responde até hoje às 15:30.');
  });

  test('fora do horário diz quando volta', () => {
    expect(
      customerStateLine(
        { status: 'open', dueAt: brasilia('2026-10-27T16:00:00'), closedReason: null, lastStaffReplyAt: null },
        brasilia('2026-10-26T20:00:00'),
        schedule,
        7,
      ),
    ).toBe('O suporte responde a partir de amanhã às 8h.');
  });

  test('atrasado admite o atraso em vez de mostrar hora no passado', () => {
    expect(
      customerStateLine(
        { status: 'open', dueAt: brasilia('2026-10-26T09:00:00'), closedReason: null, lastStaffReplyAt: null },
        brasilia('2026-10-26T10:00:00'),
        schedule,
        7,
      ),
    ).toBe('A resposta está a caminho: o suporte já está cuidando.');
  });

  test('respondido diz quando encerra sozinho', () => {
    expect(
      customerStateLine(
        { status: 'answered', dueAt: null, closedReason: null, lastStaffReplyAt: brasilia('2026-10-26T10:00:00') },
        brasilia('2026-10-26T11:00:00'),
        schedule,
        7,
      ),
    ).toBe('O suporte respondeu. Sem retorno seu, o chamado é encerrado em 02/11.');
  });

  test('encerrado automático', () => {
    expect(
      customerStateLine(
        { status: 'closed', dueAt: null, closedReason: 'automatic', lastStaffReplyAt: null },
        brasilia('2026-10-26T11:00:00'),
        schedule,
        7,
      ),
    ).toContain('Encerrado automaticamente');
  });
});

describe('frases dos eventos', () => {
  const base = { fromValue: null, toValue: null, actorName: 'Ana', targetName: null, automatic: false };

  test('a aluna não vê prioridade nem fila', () => {
    expect(customerEventSentence({ ...base, type: 'priority_changed', fromValue: 'normal', toValue: 'high' }, topicLabel)).toBeNull();
    expect(customerEventSentence({ ...base, type: 'queue_changed', toValue: 'ombudsman' }, topicLabel)).toBeNull();
  });

  test('a aluna vê quem está cuidando, o tema e o encerramento', () => {
    expect(customerEventSentence({ ...base, type: 'assigned', toValue: 'ana', targetName: 'Ana' }, topicLabel)).toBe(
      'Ana está cuidando do seu chamado',
    );
    expect(customerEventSentence({ ...base, type: 'topic_changed', toValue: 'lessons' }, topicLabel)).toBe(
      'Tema alterado para Aulas do curso',
    );
    expect(
      customerEventSentence({ ...base, type: 'status_changed', fromValue: 'answered', toValue: 'closed', automatic: true, actorName: null }, topicLabel),
    ).toBe('Chamado encerrado automaticamente por falta de retorno');
  });

  test('a equipe vê o histórico completo', () => {
    expect(staffEventSentence({ ...base, type: 'assigned', toValue: 'ana', targetName: 'Ana' }, topicLabel)).toBe('Ana assumiu o chamado');
    expect(staffEventSentence({ ...base, type: 'assigned', toValue: null }, topicLabel)).toBe('Ana devolveu para a fila');
    expect(staffEventSentence({ ...base, type: 'priority_changed', fromValue: 'normal', toValue: 'high' }, topicLabel)).toBe(
      'Ana: prioridade Normal → Alta',
    );
  });
});

describe('promessa de resposta', () => {
  test('calculada do prazo configurado', () => {
    expect(responsePromise('normal', 480)).toBe(
      'Respondemos em até 8 horas de atendimento. Acompanhe a resposta aqui no suporte.',
    );
    expect(responsePromise('high', 240).startsWith('Casos como o seu são respondidos primeiro.')).toBe(true);
  });
});
