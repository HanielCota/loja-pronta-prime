import { describe, expect, test } from 'bun:test';
import { isVisitOver, VISIT_SESSION_SECONDS, visitEndsAt } from './visit-window';

const start = new Date('2026-10-27T12:00:00Z');

describe('janela da visita', () => {
  test('vale por 1 hora a partir da criação da sessão', () => {
    expect(visitEndsAt(start).toISOString()).toBe('2026-10-27T13:00:00.000Z');
    expect(isVisitOver(start, new Date('2026-10-27T12:59:59Z'))).toBe(false);
    expect(isVisitOver(start, new Date('2026-10-27T13:00:00Z'))).toBe(true);
  });

  test('data ilegível encerra a visita', () => {
    expect(isVisitOver(new Date('não é data'), start)).toBe(true);
  });

  test('a sessão do plugin dura mais que a visita, pra a volta ao painel funcionar', () => {
    expect(VISIT_SESSION_SECONDS).toBeGreaterThan(60 * 60);
  });
});
