import { describe, expect, test } from 'bun:test';
import { accessValidityLabel, formatAccessDate, isAccessEndingSoon } from './access-validity';

const now = new Date('2026-10-22T15:00:00Z');
const until = (iso: string) => ({ kind: 'until', expiresAt: new Date(iso) }) as const;

describe('accessValidityLabel', () => {
  test('liberação manual não tem data', () => {
    expect(accessValidityLabel({ kind: 'no-end' }, now)).toBe('Liberado, sem data pra acabar');
  });

  test('longe do fim, só a data', () => {
    expect(accessValidityLabel(until('2027-10-22T15:00:00Z'), now)).toBe('Até 22/10/2027');
  });

  test('perto do fim, os dias que faltam', () => {
    expect(accessValidityLabel(until('2026-10-27T15:00:00Z'), now)).toBe(
      'Acaba em 5 dias (27/10/2026)',
    );
  });

  test('no último dia, amanhã', () => {
    expect(accessValidityLabel(until('2026-10-23T10:00:00Z'), now)).toBe(
      'Acaba amanhã (23/10/2026)',
    );
  });
});

describe('formatAccessDate', () => {
  test('usa o fuso de Brasília, não o do servidor', () => {
    // 01h UTC ainda é o dia anterior em Brasília.
    expect(formatAccessDate(new Date('2027-01-01T01:00:00Z'))).toBe('31/12/2026');
  });
});

describe('isAccessEndingSoon', () => {
  test('só com data e a 30 dias ou menos', () => {
    expect(isAccessEndingSoon({ kind: 'no-end' }, now)).toBe(false);
    expect(isAccessEndingSoon(until('2026-11-30T15:00:00Z'), now)).toBe(false);
    expect(isAccessEndingSoon(until('2026-11-10T15:00:00Z'), now)).toBe(true);
  });
});
