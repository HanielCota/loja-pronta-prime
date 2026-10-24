/**
 * Até quando vale o acesso de cada área, em texto simples pro perfil. Iniciante não sabe que a
 * compra vale um ano: a data escrita evita a surpresa de perder o acesso sem aviso.
 */

/** O prazo de uma área: a data final da compra mais longa, ou sem data (liberação manual). */
export type AccessValidity = { kind: 'until'; expiresAt: Date } | { kind: 'no-end' };

/** A partir de quantos dias o aviso muda pra "Acaba em X dias". */
export const ACCESS_ENDING_SOON_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A data no fuso de Brasília: quem comprou às 23h não vê o dia seguinte. */
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

export function formatAccessDate(date: Date): string {
  return dateFormat.format(date);
}

/** A frase da linha: "Liberado, sem data pra acabar", "Até 10/05/2027" ou "Acaba em 3 dias". */
export function accessValidityLabel(validity: AccessValidity, now: Date): string {
  if (validity.kind === 'no-end') return 'Liberado, sem data pra acabar';

  const date = formatAccessDate(validity.expiresAt);
  const daysLeft = Math.ceil((validity.expiresAt.getTime() - now.getTime()) / DAY_MS);
  if (daysLeft > ACCESS_ENDING_SOON_DAYS) return `Até ${date}`;
  if (daysLeft <= 1) return `Acaba amanhã (${date})`;
  return `Acaba em ${daysLeft} dias (${date})`;
}

/** Perto do fim: a linha ganha destaque pra ela ver antes de perder o acesso. */
export function isAccessEndingSoon(validity: AccessValidity, now: Date): boolean {
  if (validity.kind === 'no-end') return false;
  return validity.expiresAt.getTime() - now.getTime() <= ACCESS_ENDING_SOON_DAYS * DAY_MS;
}
