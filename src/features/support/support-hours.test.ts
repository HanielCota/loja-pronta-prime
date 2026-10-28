import { describe, expect, test } from 'bun:test';
import {
  addSupportMinutes,
  DEFAULT_WEEKLY_HOURS,
  describeSupportHours,
  isWithinSupportHours,
  nextSupportOpening,
  outOfHoursNotice,
  supportMinutesBetween,
  type SupportSchedule,
} from './support-hours';

/** Um horário de parede em Brasília (UTC−3). 2026-10-26 é uma segunda. */
function brasilia(value: string): Date {
  return new Date(`${value}-03:00`);
}

const schedule: SupportSchedule = {
  weekly: DEFAULT_WEEKLY_HOURS,
  holidays: [],
  pausedUntil: null,
};

describe('dentro do horário', () => {
  test('segunda a sexta das 8h às 18h, sábado até 12h, domingo fechado', () => {
    expect(isWithinSupportHours(brasilia('2026-10-26T07:59:59'), schedule)).toBe(false);
    expect(isWithinSupportHours(brasilia('2026-10-26T08:00:00'), schedule)).toBe(true);
    expect(isWithinSupportHours(brasilia('2026-10-26T17:59:59'), schedule)).toBe(true);
    expect(isWithinSupportHours(brasilia('2026-10-26T18:00:00'), schedule)).toBe(false);
    expect(isWithinSupportHours(brasilia('2026-10-31T11:00:00'), schedule)).toBe(true);
    expect(isWithinSupportHours(brasilia('2026-10-31T12:30:00'), schedule)).toBe(false);
    expect(isWithinSupportHours(brasilia('2026-11-01T10:00:00'), schedule)).toBe(false);
  });

  test('segue o relógio de Brasília mesmo quando em UTC já é outro dia', () => {
    // 02:00 UTC do dia 27 é 23:00 do dia 26 em Brasília: fechado.
    expect(isWithinSupportHours(new Date('2026-10-27T02:00:00Z'), schedule)).toBe(false);
    // 20:30 UTC é 17:30 em Brasília: aberto.
    expect(isWithinSupportHours(new Date('2026-10-26T20:30:00Z'), schedule)).toBe(true);
  });

  test('feriado e pausa fecham o suporte', () => {
    const holiday = { ...schedule, holidays: ['2026-11-02'] };
    expect(isWithinSupportHours(brasilia('2026-11-02T10:00:00'), holiday)).toBe(false);
    const paused = { ...schedule, pausedUntil: brasilia('2026-10-27T12:00:00') };
    expect(isWithinSupportHours(brasilia('2026-10-27T10:00:00'), paused)).toBe(false);
    expect(isWithinSupportHours(brasilia('2026-10-27T12:00:00'), paused)).toBe(true);
  });

  test('recusa data inválida em vez de chutar', () => {
    expect(() => isWithinSupportHours(new Date(Number.NaN), schedule)).toThrow();
  });
});

describe('próxima abertura e prazos', () => {
  test('sexta à noite abre no sábado às 8h', () => {
    expect(nextSupportOpening(brasilia('2026-10-30T20:00:00'), schedule)).toEqual(
      brasilia('2026-10-31T08:00:00'),
    );
  });

  test('aberto agora devolve o próprio momento', () => {
    const now = brasilia('2026-10-26T10:15:00');
    expect(nextSupportOpening(now, schedule)).toEqual(now);
  });

  test('o prazo só anda dentro do horário', () => {
    // Aberto às 16h de segunda com 8 horas: 2h na segunda + 6h na terça = terça às 14h.
    expect(addSupportMinutes(brasilia('2026-10-26T16:00:00'), 8 * 60, schedule)).toEqual(
      brasilia('2026-10-27T14:00:00'),
    );
    // Aberto às 23h de sexta com 8 horas: sábado 8h–12h (4h) + segunda 8h–12h = segunda às 12h.
    expect(addSupportMinutes(brasilia('2026-10-30T23:00:00'), 8 * 60, schedule)).toEqual(
      brasilia('2026-11-02T12:00:00'),
    );
  });

  test('o prazo pula feriado', () => {
    const holiday = { ...schedule, holidays: ['2026-11-02'] };
    expect(addSupportMinutes(brasilia('2026-10-31T11:00:00'), 2 * 60, holiday)).toEqual(
      brasilia('2026-11-03T09:00:00'),
    );
  });

  test('horário todo fechado não tem prazo', () => {
    const closed = { ...schedule, weekly: [null, null, null, null, null, null, null] };
    expect(addSupportMinutes(brasilia('2026-10-26T10:00:00'), 60, closed)).toBeNull();
  });

  test('conta os minutos de atendimento entre dois momentos', () => {
    expect(
      supportMinutesBetween(
        brasilia('2026-10-26T17:00:00'),
        brasilia('2026-10-27T09:30:00'),
        schedule,
      ),
    ).toBe(150);
    expect(
      supportMinutesBetween(brasilia('2026-10-27T09:00:00'), brasilia('2026-10-26T09:00:00'), schedule),
    ).toBe(0);
  });
});

describe('frases', () => {
  test('descreve a semana agrupando os dias iguais', () => {
    expect(describeSupportHours(DEFAULT_WEEKLY_HOURS)).toBe(
      'Atendimento de segunda a sexta, das 8h às 18h e sábado, das 8h às 12h (horário de Brasília).',
    );
  });

  test('todos os dias com o mesmo horário', () => {
    const everyDay = Array.from({ length: 7 }, () => ({ opens: 8 * 60, closes: 18 * 60 }));
    expect(describeSupportHours(everyDay)).toBe(
      'Atendimento todos os dias, das 8h às 18h (horário de Brasília).',
    );
  });

  test('fora do horário diz quando volta', () => {
    expect(outOfHoursNotice(brasilia('2026-10-26T20:00:00'), schedule)).toBe(
      'Estamos fora do horário. Respondemos a partir de amanhã às 8h.',
    );
    expect(outOfHoursNotice(brasilia('2026-10-31T13:00:00'), schedule)).toBe(
      'Estamos fora do horário. Respondemos a partir de segunda às 8h.',
    );
    expect(outOfHoursNotice(brasilia('2026-10-26T06:00:00'), schedule)).toBe(
      'Estamos fora do horário. Respondemos a partir de hoje às 8h.',
    );
    expect(outOfHoursNotice(brasilia('2026-10-26T10:00:00'), schedule)).toBeNull();
  });
});
