/**
 * Horário de atendimento do suporte e o relógio dos prazos. O prazo de resposta só corre dentro
 * do horário: um chamado aberto às 23h não nasce quase atrasado. Tudo no relógio de Brasília,
 * que é UTC−3 fixo desde 2019 (sem horário de verão), então a conta é feita somando 3 horas, sem
 * depender do fuso da máquina.
 */

const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
/** Procurar mais longe que isso é sinal de horário todo fechado: a conta para de andar. */
const SEARCH_DAYS = 120;

/** Abre e fecha em minutos desde a meia-noite (ex.: 8h = 480). `null`: fechado no dia. */
export type DayHours = { opens: number; closes: number } | null;

export type SupportSchedule = {
  /** Domingo (0) a sábado (6). */
  weekly: readonly DayHours[];
  /** Datas fechadas, no formato AAAA-MM-DD (dia de Brasília). */
  holidays: readonly string[];
  /** Enquanto pausado, o suporte conta como fechado. */
  pausedUntil: Date | null;
};

export const DEFAULT_WEEKLY_HOURS: readonly DayHours[] = [
  null,
  { opens: 8 * 60, closes: 18 * 60 },
  { opens: 8 * 60, closes: 18 * 60 },
  { opens: 8 * 60, closes: 18 * 60 },
  { opens: 8 * 60, closes: 18 * 60 },
  { opens: 8 * 60, closes: 18 * 60 },
  { opens: 8 * 60, closes: 12 * 60 },
];

const WEEKDAY_NAMES = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
] as const;

class InvalidSupportDateError extends Error {
  constructor(value: unknown) {
    super(`Data inválida no horário do suporte: ${String(value)}.`);
    this.name = 'InvalidSupportDateError';
  }
}

function assertValid(date: Date): void {
  if (Number.isNaN(date.getTime())) throw new InvalidSupportDateError(date);
}

/** Meia-noite de Brasília do dia de `date`, em milissegundos UTC. */
function brasiliaMidnight(date: Date): number {
  const local = date.getTime() - BRASILIA_OFFSET_MS;
  return local - (((local % DAY_MS) + DAY_MS) % DAY_MS) + BRASILIA_OFFSET_MS;
}

function brasiliaParts(date: Date) {
  const local = new Date(date.getTime() - BRASILIA_OFFSET_MS);
  return {
    weekday: local.getUTCDay(),
    isoDate: local.toISOString().slice(0, 10),
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

/** A janela de atendimento do dia que começa em `midnight`, já descontados feriado e pausa. */
function windowOfDay(midnight: number, schedule: SupportSchedule): [number, number] | null {
  const parts = brasiliaParts(new Date(midnight));
  if (schedule.holidays.includes(parts.isoDate)) return null;
  const hours = schedule.weekly[parts.weekday] ?? null;
  if (!hours || hours.closes <= hours.opens) return null;
  const start = midnight + hours.opens * MINUTE_MS;
  const end = midnight + hours.closes * MINUTE_MS;
  const pausedUntil = schedule.pausedUntil?.getTime() ?? 0;
  if (pausedUntil >= end) return null;
  return [Math.max(start, pausedUntil), end];
}

export function isWithinSupportHours(now: Date, schedule: SupportSchedule): boolean {
  assertValid(now);
  const window = windowOfDay(brasiliaMidnight(now), schedule);
  if (!window) return false;
  return now.getTime() >= window[0] && now.getTime() < window[1];
}

/** O próximo momento em que o suporte está aberto (o próprio `now`, se já estiver). */
export function nextSupportOpening(now: Date, schedule: SupportSchedule): Date | null {
  assertValid(now);
  let midnight = brasiliaMidnight(now);
  for (let day = 0; day < SEARCH_DAYS; day++, midnight += DAY_MS) {
    const window = windowOfDay(midnight, schedule);
    if (!window) continue;
    if (now.getTime() >= window[1]) continue;
    return new Date(Math.max(window[0], now.getTime()));
  }
  return null;
}

/**
 * Soma minutos de atendimento a `start`: pula a noite, o fim de semana, os feriados e a pausa.
 * Com o horário todo fechado, devolve `null` (quem chama decide o que mostrar).
 */
export function addSupportMinutes(
  start: Date,
  minutes: number,
  schedule: SupportSchedule,
): Date | null {
  assertValid(start);
  let remaining = Math.max(0, minutes) * MINUTE_MS;
  let midnight = brasiliaMidnight(start);
  for (let day = 0; day < SEARCH_DAYS * 4; day++, midnight += DAY_MS) {
    const window = windowOfDay(midnight, schedule);
    if (!window) continue;
    const from = Math.max(window[0], start.getTime());
    if (from >= window[1]) continue;
    const available = window[1] - from;
    if (remaining <= available) return new Date(from + remaining);
    remaining -= available;
  }
  return null;
}

/** Minutos de atendimento entre dois momentos (zero se `end` vem antes). */
export function supportMinutesBetween(start: Date, end: Date, schedule: SupportSchedule): number {
  assertValid(start);
  assertValid(end);
  if (end.getTime() <= start.getTime()) return 0;
  let total = 0;
  let midnight = brasiliaMidnight(start);
  for (; midnight < end.getTime(); midnight += DAY_MS) {
    const window = windowOfDay(midnight, schedule);
    if (!window) continue;
    const from = Math.max(window[0], start.getTime());
    const to = Math.min(window[1], end.getTime());
    if (to > from) total += to - from;
  }
  return Math.round(total / MINUTE_MS);
}

/** "8h" ou "8h30". */
export function formatHour(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours}h`;
  return `${hours}h${String(rest).padStart(2, '0')}`;
}

function sameHours(a: DayHours, b: DayHours): boolean {
  if (!a || !b) return a === b;
  return a.opens === b.opens && a.closes === b.closes;
}

function dayRange(first: number, last: number): string {
  if (first === last) return WEEKDAY_NAMES[first] ?? '';
  if (last === first + 1) return `${WEEKDAY_NAMES[first]} e ${WEEKDAY_NAMES[last]}`;
  return `${WEEKDAY_NAMES[first]} a ${WEEKDAY_NAMES[last]}`;
}

/**
 * A frase do horário, montada da configuração: "Atendimento de segunda a sexta, das 8h às 18h,
 * e sábado, das 8h às 12h (horário de Brasília)." A semana começa na segunda, como a gente fala.
 */
export function describeSupportHours(weekly: readonly DayHours[]): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const groups: { first: number; last: number; hours: NonNullable<DayHours> }[] = [];
  for (const day of order) {
    const hours = weekly[day] ?? null;
    if (!hours) continue;
    const previous = groups.at(-1);
    const follows = previous && order.indexOf(day) === order.indexOf(previous.last) + 1;
    if (previous && follows && sameHours(previous.hours, hours)) {
      previous.last = day;
      continue;
    }
    groups.push({ first: day, last: day, hours });
  }
  if (groups.length === 0) return 'O suporte está sem horário de atendimento no momento.';
  if (groups.length === 1 && groups[0]?.first === 1 && groups[0].last === 0) {
    const only = groups[0].hours;
    return `Atendimento todos os dias, das ${formatHour(only.opens)} às ${formatHour(only.closes)} (horário de Brasília).`;
  }
  const parts = groups.map(
    (group) =>
      `${dayRange(group.first, group.last)}, das ${formatHour(group.hours.opens)} às ${formatHour(group.hours.closes)}`,
  );
  const sentence =
    parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join('; ')} e ${parts.at(-1)}`;
  const prefix = groups[0]?.first === groups[0]?.last ? 'Atendimento' : 'Atendimento de';
  return `${prefix} ${sentence} (horário de Brasília).`;
}

/** "hoje às 8h", "amanhã às 8h" ou "segunda às 8h". */
export function describeWhen(moment: Date, now: Date): string {
  const today = brasiliaMidnight(now);
  const day = brasiliaMidnight(moment);
  const hour = formatHour(brasiliaParts(moment).minutes);
  if (day === today) return `hoje às ${hour}`;
  if (day === today + DAY_MS) return `amanhã às ${hour}`;
  const weekday = WEEKDAY_NAMES[brasiliaParts(moment).weekday] ?? '';
  return `${weekday} às ${hour}`;
}

/** Fora do horário: quando a resposta volta a sair. Dentro do horário: `null`. */
export function outOfHoursNotice(now: Date, schedule: SupportSchedule): string | null {
  if (isWithinSupportHours(now, schedule)) return null;
  const opening = nextSupportOpening(now, schedule);
  if (!opening) return 'Estamos fora do horário. Avisamos aqui quando o atendimento voltar.';
  return `Estamos fora do horário. Respondemos a partir de ${describeWhen(opening, now)}.`;
}

/** Hora de Brasília em "HH:MM", pra mostrar prazos. */
export function brasiliaClock(moment: Date): string {
  const minutes = brasiliaParts(moment).minutes;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Dia de Brasília (AAAA-MM-DD) de um momento. */
export function brasiliaDate(moment: Date): string {
  return brasiliaParts(moment).isoDate;
}

/** Hora de Brasília (0 a 23) de um momento: o mapa de horários do Desempenho usa. */
export function brasiliaHour(moment: Date): number {
  return Math.floor(brasiliaParts(moment).minutes / 60);
}

export function brasiliaWeekday(moment: Date): number {
  return brasiliaParts(moment).weekday;
}
