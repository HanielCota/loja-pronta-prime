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

const SHOPEE_LINK = 'conectar ou desconectar a Shopee da aluna';
const SHOPEE_STORE = 'mudar a loja da aluna na Shopee';
const TICKET_DECISION = 'encerrar, reabrir ou avaliar o chamado pela aluna';
const TICKET_WRITE = 'abrir chamado ou escrever como a aluna. Responda pelo painel do suporte';

/** O que fica bloqueado e como a recusa termina a frase "Não é possível ...". */
export const BLOCKED_DURING_VISIT: Readonly<Record<string, string>> = {
  // Segurança da conta.
  createFirstPassword: 'criar a senha da aluna',
  changePassword: 'trocar a senha da aluna',
  signOutOtherDevices: 'encerrar as sessões da aluna',
  login: 'entrar em outra conta',
  requestPasswordReset: 'pedir troca de senha',
  resetPassword: 'trocar a senha da aluna',
  requestTicketAccess: 'pedir link de acesso ao chamado',
  // Identidade dela.
  updateName: 'mudar o nome da aluna',
  updateProfilePhoto: 'mudar a foto da aluna',
  // Gasta a cota de criações pagas dela.
  createLogo: 'criar ou ajustar logo (gasta as criações da aluna)',
  tweakLogo: 'criar ou ajustar logo (gasta as criações da aluna)',
  requestAssistantAdvice: 'pedir conselho ao assistente (gasta os pedidos da aluna)',
  // Vínculo com a conta da Shopee dela.
  confirmShopeeAccount: SHOPEE_LINK,
  connectShopee: SHOPEE_LINK,
  startManualShopeeAuthorization: SHOPEE_LINK,
  completeManualShopeeAuthorization: SHOPEE_LINK,
  disconnectShopee: SHOPEE_LINK,
  shopeeCallback: SHOPEE_LINK,
  // Publica ou muda a loja pública dela (e o consentimento da publicação é dela).
  startRecoveredPublication: 'publicar produtos na Shopee da aluna',
  confirmRecoveredPublicationAction: 'publicar produtos na Shopee da aluna',
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
  const blocked = BLOCKED_DURING_VISIT[actionName];
  if (blocked !== undefined) return { kind: 'blocked', message: refusalMessage(blocked) };
  if (QUIET_DURING_VISIT.has(actionName)) return { kind: 'quiet' };
  if (READ_ONLY_DURING_VISIT.has(actionName)) return { kind: 'read' };
  if (ENDS_VISIT.has(actionName)) return { kind: 'ends_visit' };
  return { kind: 'recorded' };
}

export function refusalMessage(action: string): string {
  return `Não é possível ${action} enquanto você usa a conta dela.`;
}

/** O que fica bloqueado, em uma frase, pra faixa da visita. */
export const BLOCKED_SUMMARY =
  'Senha, nome, foto, Shopee, criação de logo, conselho do assistente e decisões do chamado ficam bloqueados.';

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
