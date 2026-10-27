/**
 * E-mails do suporte, em texto simples como os de acesso. O texto da resposta nunca vai no e-mail:
 * o e-mail só avisa e leva pra plataforma (ou pro link mágico, no chamado aberto sem login).
 */

export type SupportEmail = { subject: string; text: string };

const SIGNATURE = 'Suporte Escala Shop';

export function replyToRequesterEmail(subject: string, url: string): SupportEmail {
  return {
    subject: `Nova resposta no seu chamado: ${subject}`,
    text: [
      'Escala Shop',
      'O suporte respondeu o seu chamado.',
      `Ler a resposta:\n${url}`,
      'Pra continuar a conversa, responda por lá.',
      SIGNATURE,
    ].join('\n\n'),
  };
}

export function publicTicketLinkEmail(subject: string, url: string, days: number): SupportEmail {
  return {
    subject: `Acompanhe o seu chamado: ${subject}`,
    text: [
      'Escala Shop',
      'Recebemos o seu pedido de ajuda pra entrar na plataforma.',
      `Acompanhar o chamado:\n${url}`,
      `Este link vale por ${days} dias e é renovado a cada resposta do suporte.`,
      'Se não foi você que pediu, pode ignorar este e-mail.',
      SIGNATURE,
    ].join('\n\n'),
  };
}

export function newTicketToStaffEmail(code: string, subject: string, url: string): SupportEmail {
  return {
    subject: `Chamado novo ${code}: ${subject}`,
    text: ['Chegou um chamado novo.', `Assuma o chamado na fila:\n${url}`, SIGNATURE].join('\n\n'),
  };
}

export function requesterRepliedEmail(code: string, subject: string, url: string): SupportEmail {
  return {
    subject: `A aluna respondeu o chamado ${code}: ${subject}`,
    text: ['A aluna respondeu um chamado que está com você.', `Abrir o chamado:\n${url}`, SIGNATURE].join(
      '\n\n',
    ),
  };
}

export function deadlineMissedEmail(code: string, subject: string, url: string): SupportEmail {
  return {
    subject: `Prazo perdido no chamado ${code}: ${subject}`,
    text: [
      'Um chamado passou do prazo de resposta.',
      `Abrir o chamado:\n${url}`,
      SIGNATURE,
    ].join('\n\n'),
  };
}

export type DailySummary = {
  waiting: number;
  late: number;
  unassigned: number;
  averageRating: number | null;
  url: string;
};

export function dailySummaryEmail(summary: DailySummary): SupportEmail {
  const rating =
    summary.averageRating === null
      ? 'Sem avaliações ontem.'
      : `Nota média de ontem: ${summary.averageRating.toFixed(1).replace('.', ',')} de 5.`;
  return {
    subject: `Suporte hoje: ${summary.waiting} aguardando, ${summary.late} atrasados`,
    text: [
      'Resumo do suporte às 8h.',
      `Aguardando resposta: ${summary.waiting}`,
      `Atrasados: ${summary.late}`,
      `Sem responsável: ${summary.unassigned}`,
      rating,
      `Abrir a fila:\n${summary.url}`,
      SIGNATURE,
    ].join('\n'),
  };
}
