import type { TicketStatus } from './ticket-rules';

/** Respostas prontas da equipe. Os valores de fábrica entram no banco uma vez só. */

export type ReplyTemplate = {
  title: string;
  body: string;
  /** Status ao enviar com esta resposta; `null` usa o padrão (respondido). */
  statusAfter: TicketStatus | null;
};

export const DEFAULT_REPLY_TEMPLATES: readonly ReplyTemplate[] = [
  { title: 'Saudação', body: 'Oi, {aluna}! Tudo bem?', statusAfter: null },
  {
    title: 'Recebemos e estamos analisando',
    body: 'Oi, {aluna}! Recebemos o seu chamado sobre "{assunto}" e já estamos olhando. Assim que tiver novidade, respondo por aqui.',
    statusAfter: 'answered',
  },
  {
    title: 'Pedir mais detalhes',
    body: 'Oi, {aluna}! Pra eu entender melhor, você consegue mandar um print da tela onde aparece o problema e contar o que fez antes de ele aparecer?',
    statusAfter: 'answered',
  },
  {
    title: 'Ajuste feito na sua conta',
    body: 'Oi, {aluna}! Fiz o ajuste na sua conta. Pode conferir e me contar se ficou tudo certo?',
    statusAfter: 'answered',
  },
  {
    title: 'Resolvido, encerrando',
    body: 'Que bom que deu certo, {aluna}! Vou encerrar este chamado. Se precisar, é só responder aqui que ele reabre.',
    statusAfter: 'closed',
  },
  { title: 'Assinatura', body: 'Um abraço,\n{atendente}\nSuporte Escala Shop', statusAfter: null },
];

export type TemplateValues = { aluna: string; assunto: string; atendente: string };

/** Troca `{aluna}`, `{assunto}` e `{atendente}`. A aluna aparece pelo primeiro nome. */
export function fillTemplate(body: string, values: TemplateValues): string {
  const firstName = values.aluna.trim().split(/\s+/)[0] || values.aluna;
  return body
    .replaceAll('{aluna}', firstName)
    .replaceAll('{assunto}', values.assunto)
    .replaceAll('{atendente}', values.atendente);
}
