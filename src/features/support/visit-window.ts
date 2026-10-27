/**
 * "Entrar como aluna" dura 1 hora, contada da criação da sessão no servidor (a sessão não se
 * renova, mas a conta não depende de cookie do navegador).
 */
export const VISIT_MINUTES = 60;

/**
 * A sessão do plugin vive um pouco mais que a visita. Entre o fim da visita e o fim da sessão,
 * a plataforma recusa tudo, mas "Voltar ao painel" ainda consegue devolver a sessão da equipe;
 * sem essa folga, a pessoa ficaria deslogada e teria que entrar de novo.
 */
export const VISIT_GRACE_MINUTES = 5;

export const VISIT_SESSION_SECONDS = (VISIT_MINUTES + VISIT_GRACE_MINUTES) * 60;

export const VISIT_OVER_MESSAGE = 'O acesso à conta da aluna terminou. Volte ao painel.';

/** Pra onde as páginas mandam quem ainda está numa visita vencida. */
export const VISIT_OVER_PATH = '/visita-encerrada';

/** Até quando vale a visita que começou em `startedAt`. */
export function visitEndsAt(startedAt: Date): Date {
  return new Date(startedAt.getTime() + VISIT_MINUTES * 60 * 1000);
}

/** A visita já passou de 1 hora? Data ilegível encerra a visita em vez de deixá-la aberta. */
export function isVisitOver(startedAt: Date, now: Date = new Date()): boolean {
  if (Number.isNaN(startedAt.getTime())) return true;
  return now.getTime() >= visitEndsAt(startedAt).getTime();
}
