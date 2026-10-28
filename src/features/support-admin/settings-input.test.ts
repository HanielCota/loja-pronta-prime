import { describe, expect, test } from 'bun:test';
import { clockValue, parseClock, parseDeadlines, parseIsoDate, parseSteps, parseWeeklyHours } from './settings-input';

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe('horário', () => {
  test('lê e escreve a hora', () => {
    expect(parseClock('08:30')).toBe(510);
    expect(parseClock('24:00')).toBeNull();
    expect(clockValue(510)).toBe('08:30');
  });

  test('lê a semana e fecha os dias desmarcados', () => {
    const result = parseWeeklyHours(form({ 'dia-1-aberto': '1', 'dia-1-abre': '08:00', 'dia-1-fecha': '18:00' }));
    expect(result.ok && result.value[1]).toEqual({ opens: 480, closes: 1080 });
    expect(result.ok && result.value[0]).toBeNull();
  });

  test('recusa fechamento antes da abertura e semana toda fechada', () => {
    expect(parseWeeklyHours(form({ 'dia-2-aberto': '1', 'dia-2-abre': '18:00', 'dia-2-fecha': '08:00' })).ok).toBe(false);
    expect(parseWeeklyHours(form({})).ok).toBe(false);
  });
});

describe('prazos', () => {
  test('guarda em minutos', () => {
    const result = parseDeadlines(form({ 'prazo-urgent': '2', 'prazo-high': '4', 'prazo-normal': '8', 'prazo-low': '16' }));
    expect(result).toEqual({ ok: true, value: { urgent: 120, high: 240, normal: 480, low: 960 } });
  });

  test('recusa prioridade alta com prazo maior que a normal', () => {
    expect(parseDeadlines(form({ 'prazo-urgent': '2', 'prazo-high': '10', 'prazo-normal': '8', 'prazo-low': '16' })).ok).toBe(false);
  });
});

describe('outros campos', () => {
  test('data de verdade', () => {
    expect(parseIsoDate('2026-11-02')).toBe('2026-11-02');
    expect(parseIsoDate('2026-02-30')).toBeNull();
  });

  test('passos um por linha', () => {
    expect(parseSteps(' Atualize a página \n\n Teste outro navegador ')).toEqual(['Atualize a página', 'Teste outro navegador']);
  });
});
