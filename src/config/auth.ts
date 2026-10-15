/**
 * Regras de acesso num lugar só: usadas pela validação, pelo Better Auth, pelo limite de
 * tentativas e pelos textos das telas (que nunca repetem esses números à mão).
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Validade do link de redefinição de senha. */
export const RESET_LINK_TTL_HOURS = 1;
/** Validade do link de confirmação de email. */
export const VERIFICATION_LINK_TTL_HOURS = 24;

/**
 * Tentativas por minuto nas ações de acesso e na transcrição da marca.
 * - Login por email + IP: o limite apertado. Quem tenta adivinhar a senha de uma conta de um
 *   mesmo lugar para logo; a dona da conta, de outro IP, continua entrando.
 * - Login só por email: teto mais alto, pra quem troca de IP a cada tentativa. Alto o bastante
 *   pra que travar a conta de alguém custe muitos IPs.
 * - Por IP: freia quem testa uma senha em muitas contas (só quando o IP é conhecido).
 */
export const RATE_LIMITS_PER_MINUTE = {
  /** Começar uma autorização: evita rajadas e links antigos em várias abas. */
  shopeePerUser: 3,
  shopeeManualReturnPerUser: 6,
  /** Autorizar e consultar o piloto Bling: evita rajadas na conta da empresa. */
  blingPerUser: 3,
  loginPerEmailAndIp: 5,
  loginPerEmail: 30,
  loginPerIp: 30,
  recoverPerEmail: 3,
  recoverPerIp: 10,
  resetPerIp: 10,
  /** Criar a senha no primeiro acesso (já logada): por conta. */
  firstPasswordPerUser: 5,
  /** Trocar a senha no perfil (pede a atual): por conta, pra ninguém adivinhar a atual. */
  changePasswordPerUser: 5,
  /** Trocar o nome no perfil: por conta. */
  profileNamePerUser: 10,
  /** Enviar ou remover a foto: limita o processamento de imagens e o uso do bucket. */
  profilePhotoPerUser: 6,
  /** Cada gravação usa a API de transcrição: evita chamadas em sequência sem fim. */
  speechPerUser: 6,
} as const;

/**
 * Limites com janela mais longa que um minuto (em segundos). Pedir link de recuperação: 3 por
 * minuto ainda deixaria encher a caixa de entrada de alguém com milhares de emails por dia.
 */
export const RATE_LIMITS_LONG = {
  recoverPerEmailPerDay: { max: 10, windowSeconds: 24 * 60 * 60 },
  speechPerUserPerDay: { max: 30, windowSeconds: 24 * 60 * 60 },
} as const;
