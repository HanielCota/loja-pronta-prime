import type { DayHours } from '@/features/support/support-hours';
import { TICKET_PRIORITIES, type TicketPriority } from '@/features/support/ticket-rules';

/**
 * Leitura dos formulários de Configurações do suporte (funções puras, testadas). Valor estranho
 * vira erro com frase, nunca um horário ou prazo chutado.
 */

export type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

/** "08:30" → 510. */
export function parseClock(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 510 → "08:30" (pro campo de hora). */
export function clockValue(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;

/** O horário da semana: `dia-N-aberto`, `dia-N-abre`, `dia-N-fecha` (N de 0 = domingo a 6). */
export function parseWeeklyHours(form: FormData): ParseResult<DayHours[]> {
  const days: DayHours[] = [];
  for (let day = 0; day < 7; day++) {
    if (form.get(`dia-${day}-aberto`) !== '1') {
      days.push(null);
      continue;
    }
    const opens = parseClock(String(form.get(`dia-${day}-abre`) ?? ''));
    const closes = parseClock(String(form.get(`dia-${day}-fecha`) ?? ''));
    if (opens === null || closes === null)
      return { ok: false, message: `Confira os horários de ${WEEKDAY_LABELS[day]?.toLowerCase()}.` };
    if (closes <= opens)
      return { ok: false, message: `Em ${WEEKDAY_LABELS[day]?.toLowerCase()}, o fechamento precisa ser depois da abertura.` };
    days.push({ opens, closes });
  }
  if (days.every((day) => day === null))
    return { ok: false, message: 'Deixe pelo menos um dia aberto. Pra parar o suporte por um tempo, use a pausa.' };
  return { ok: true, value: days };
}

/** Prazos em horas de atendimento (`prazo-urgent`...), guardados em minutos. */
export function parseDeadlines(form: FormData): ParseResult<Record<TicketPriority, number>> {
  const result = {} as Record<TicketPriority, number>;
  for (const priority of TICKET_PRIORITIES) {
    const hours = Number(String(form.get(`prazo-${priority}`) ?? '').replace(',', '.'));
    if (!Number.isFinite(hours) || hours < 0.5 || hours > 200)
      return { ok: false, message: 'Cada prazo precisa ficar entre meia hora e 200 horas de atendimento.' };
    result[priority] = Math.round(hours * 60);
  }
  if (!(result.urgent <= result.high && result.high <= result.normal && result.normal <= result.low))
    return { ok: false, message: 'O prazo de uma prioridade mais alta não pode ser maior que o de uma mais baixa.' };
  return { ok: true, value: result };
}

export function parseWholeNumber(value: FormDataEntryValue | null, min: number, max: number): number | null {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

/** "AAAA-MM-DD" de verdade (o campo de data manda assim). */
export function parseIsoDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return value;
}

/** Os passos do FAQ: um por linha, sem linhas vazias. */
export function parseSteps(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
}
