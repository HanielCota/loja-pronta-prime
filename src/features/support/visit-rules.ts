/**
 * O que a equipe pode fazer dentro da conta da aluna ("Entrar como aluna"), pelo nome da Server
 * Action ou da rota. Um teste confere que todo nome daqui ainda existe: renomear uma ação não pode
 * reabrir a trava em silêncio.
 *
 * - bloqueada: o efeito dura além da visita, é um ato da aluna (consentimento, avaliação), gasta a
 *   cota ou o dinheiro dela, ou mexe na segurança da conta;
 * - silenciosa: marcas pequenas (lido, presença, posição do vídeo) que contariam como se fosse ela;
 *   durante a visita não são gravadas;
 * - leitura: não muda nada, então não vai pro registro;
 * - sair: encerra a visita em vez de deslogar;
 * - o resto é permitido e fica registrado com o nome de quem fez.
 */

/** Uma ação recusada: o que não dá pra fazer e, quando ajuda, o porquê ou o que fazer. */
type BlockedAction = { what: string; why?: string };

const SHOPEE_LINK: BlockedAction = { what: 'conectar ou desconectar a Shopee dela' };
const SHOPEE_STORE: BlockedAction = { what: 'mudar a loja dela na Shopee' };
const SHOPEE_PUBLISH: BlockedAction = {
  what: 'publicar produtos na Shopee dela',
  why: 'Quem confirma a publicação é a aluna.',
};
const LOGO: BlockedAction = {
  what: 'criar ou ajustar logo',
  why: 'Isso gastaria uma das criações da aluna.',
};
const TICKET_DECISION: BlockedAction = { what: 'encerrar, reabrir ou avaliar o chamado por ela' };
const TICKET_WRITE: BlockedAction = {
  what: 'abrir chamado ou escrever como ela',
  why: 'Responda pelo painel do suporte.',
};

/** O que fica bloqueado durante a visita, pelo nome da ação ou da rota. */
export const BLOCKED_DURING_VISIT: Readonly<Record<string, BlockedAction>> = {
  // Segurança da conta.
  createFirstPassword: { what: 'criar a senha dela' },
  changePassword: { what: 'trocar a senha dela' },
  signOutOtherDevices: { what: 'desconectar os aparelhos dela' },
  login: { what: 'entrar em outra conta', why: 'Volte ao painel antes.' },
  requestPasswordReset: { what: 'pedir troca de senha' },
  resetPassword: { what: 'trocar a senha dela' },
  requestTicketAccess: { what: 'pedir o link de acesso ao chamado' },
  // Identidade dela.
  updateName: { what: 'mudar o nome dela' },
  updateProfilePhoto: { what: 'mudar a foto dela' },
  // Gasta a cota de criações pagas dela.
  createLogo: LOGO,
  tweakLogo: LOGO,
  requestAssistantAdvice: {
    what: 'pedir conselho ao assistente',
    why: 'Isso gastaria um dos pedidos da aluna.',
  },
  // Vínculo com a conta da Shopee dela.
  confirmShopeeAccount: SHOPEE_LINK,
  connectShopee: SHOPEE_LINK,
  startManualShopeeAuthorization: SHOPEE_LINK,
  completeManualShopeeAuthorization: SHOPEE_LINK,
  disconnectShopee: SHOPEE_LINK,
  shopeeCallback: SHOPEE_LINK,
  // Publica ou muda a loja pública dela (e o consentimento da publicação é dela).
  startRecoveredPublication: SHOPEE_PUBLISH,
  confirmRecoveredPublicationAction: SHOPEE_PUBLISH,
  submitPublicationBatch: SHOPEE_STORE,
  confirmPublicationCorrection: SHOPEE_STORE,
  sendStoreBrand: SHOPEE_STORE,
  confirmSavedBrand: SHOPEE_STORE,
  submitListingChanges: SHOPEE_STORE,
  retryStoreChange: SHOPEE_STORE,
  retryBrandPublication: SHOPEE_STORE,
  createCategoryExperiment: SHOPEE_STORE,
  finishStoreExperiment: SHOPEE_STORE,
  // Decisões e avaliação do chamado são dela e entram nas métricas do suporte.
  closeTicketAction: TICKET_DECISION,
  resolveTicketAction: TICKET_DECISION,
  undoCloseAction: TICKET_DECISION,
  notResolvedAction: TICKET_DECISION,
  rateAction: TICKET_DECISION,
  openTicket: TICKET_WRITE,
  sendTicketMessage: TICKET_WRITE,
};

/** Durante a visita, não gravam nada (a ação devolve um resultado neutro). */
export const QUIET_DURING_VISIT: ReadonlySet<string> = new Set([
  'markMyTicketRead',
  'faqFeedbackAction',
  'recordSllLessonView',
  'saveSllLessonPosition',
  'recordPresence',
  'recordWhatsappClick',
]);

/** Só leem: rodam normalmente e não vão pro registro. */
export const READ_ONLY_DURING_VISIT: ReadonlySet<string> = new Set([
  'getMyUnreadSupportCount',
  'calculatePrice',
  'calculateDiscount',
  'calculateAds',
]);

/** "Sair" durante a visita encerra a visita e devolve a sessão da equipe. */
export const ENDS_VISIT: ReadonlySet<string> = new Set(['signOut']);

export type VisitRule =
  | { kind: 'blocked'; message: string }
  | { kind: 'quiet' }
  | { kind: 'read' }
  | { kind: 'ends_visit' }
  | { kind: 'recorded' };

export function visitRuleFor(actionName: string): VisitRule {
  const blocked = blockedMessage(actionName);
  if (blocked !== null) return { kind: 'blocked', message: blocked };
  if (QUIET_DURING_VISIT.has(actionName)) return { kind: 'quiet' };
  if (READ_ONLY_DURING_VISIT.has(actionName)) return { kind: 'read' };
  if (ENDS_VISIT.has(actionName)) return { kind: 'ends_visit' };
  return { kind: 'recorded' };
}

/**
 * A recusa de uma ação bloqueada, em frase completa, ou `null` se ela não é bloqueada. Só nomes da
 * própria lista: `?acao=constructor` não pode puxar coisas herdadas de `Object`.
 */
export function blockedMessage(actionName: string): string | null {
  if (!Object.hasOwn(BLOCKED_DURING_VISIT, actionName)) return null;
  const blocked = BLOCKED_DURING_VISIT[actionName];
  if (!blocked) return null;
  const refusal = `Não é possível ${blocked.what} enquanto você usa a conta da aluna.`;
  if (!blocked.why) return refusal;
  return `${refusal} ${blocked.why}`;
}

/** O que fica bloqueado, em uma frase, pra faixa da visita. */
export const BLOCKED_SUMMARY =
  'Senha, nome, foto, Shopee, criação de logo e conselho do assistente ficam bloqueados.';

/** Pra onde vai uma recusa: a página que explica, com o nome da ação (nunca texto livre). */
export const VISIT_BLOCKED_PATH = '/visita-bloqueada';

/**
 * O destino de um `redirect()` lançado dentro de uma Server Action, ou `null` se o erro é outro. O
 * Next guarda o destino no `digest` ("NEXT_REDIRECT;replace;/caminho;307;").
 */
export function redirectTargetOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('digest' in error)) return null;
  const { digest } = error;
  if (typeof digest !== 'string' || !digest.startsWith('NEXT_REDIRECT;')) return null;
  const target = digest.split(';')[2];
  if (!target) return null;
  return target;
}
