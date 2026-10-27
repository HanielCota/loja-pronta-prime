import { describe, expect, test } from 'bun:test';
import { DEFAULT_SUPPORT_CATALOG, OTHER_ISSUE_ID, visibleSituations } from './catalog';
import { planSupportTicket } from './plan-ticket';

const catalog = DEFAULT_SUPPORT_CATALOG;

describe('catálogo', () => {
  test('todo tema com situações ganha "Outro problema" no fim', () => {
    const lessons = catalog.find((topic) => topic.id === 'lessons');
    const situations = visibleSituations(lessons!);
    expect(situations.at(-1)?.id).toBe(OTHER_ISSUE_ID);
    expect(situations.at(-1)?.question).toBe(lessons!.question);
  });

  test('tema sem situações não ganha "Outro problema"', () => {
    const other = catalog.find((topic) => topic.id === 'other');
    expect(visibleSituations(other!)).toEqual([]);
  });

  test('ids dos temas são únicos', () => {
    expect(new Set(catalog.map((topic) => topic.id)).size).toBe(catalog.length);
  });
});

describe('planSupportTicket', () => {
  test('tira prioridade e assunto da situação', () => {
    const result = planSupportTicket(catalog, {
      topicId: 'access',
      situationId: 'cant-login',
      description: 'Aparece senha incorreta mesmo depois de trocar.',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ticket.priority).toBe('high');
    expect(result.ticket.queue).toBe('general');
    expect(result.ticket.subject).toBe(
      'Não consigo entrar: Aparece senha incorreta mesmo depois de trocar.',
    );
  });

  test('Ouvidoria vai pra fila restrita', () => {
    const result = planSupportTicket(catalog, {
      topicId: 'ombudsman',
      situationId: null,
      description: 'Abri um chamado há uma semana e ninguém me respondeu ainda.',
    });
    expect(result.ok && result.ticket.queue).toBe('ombudsman');
  });

  test('exige a situação quando o tema tem situações', () => {
    const result = planSupportTicket(catalog, {
      topicId: 'lessons',
      situationId: null,
      description: 'A aula não abre de jeito nenhum aqui no celular.',
    });
    expect(result).toEqual({
      ok: false,
      error: { field: 'situation', message: 'Escolha o que está acontecendo.' },
    });
  });

  test('recusa tema ou situação que não existem', () => {
    expect(
      planSupportTicket(catalog, { topicId: 'orders', situationId: null, description: 'x'.repeat(50) })
        .ok,
    ).toBe(false);
    expect(
      planSupportTicket(catalog, {
        topicId: 'lessons',
        situationId: 'payout-missing',
        description: 'x'.repeat(50),
      }).ok,
    ).toBe(false);
  });

  test('não tem mínimo de caracteres, só não aceita vazio', () => {
    const short = planSupportTicket(catalog, { topicId: 'lessons', situationId: OTHER_ISSUE_ID, description: 'travou' });
    expect(short.ok).toBe(true);
    const empty = planSupportTicket(catalog, { topicId: 'lessons', situationId: OTHER_ISSUE_ID, description: '   ' });
    expect(empty.ok).toBe(false);
  });

  test('"Outro problema" usa o rótulo do tema no assunto e corta em 120', () => {
    const result = planSupportTicket(catalog, {
      topicId: 'lessons',
      situationId: OTHER_ISSUE_ID,
      description: `Primeira linha\ncom quebra ${'muito texto '.repeat(30)}`,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ticket.subject.startsWith('Aulas do curso: Primeira linha com quebra')).toBe(true);
    expect(result.ticket.subject.length).toBeLessThanOrEqual(120);
    expect(result.ticket.priority).toBe('normal');
  });

  test('situação desativada some da lista e é recusada', () => {
    const edited = catalog.map((topic) =>
      topic.id === 'lessons'
        ? {
            ...topic,
            situations: topic.situations.map((item) =>
              item.id === 'material' ? { ...item, active: false } : item,
            ),
          }
        : topic,
    );
    const result = planSupportTicket(edited, {
      topicId: 'lessons',
      situationId: 'material',
      description: 'A calculadora mostra um valor estranho.',
    });
    expect(result.ok).toBe(false);
  });
});
