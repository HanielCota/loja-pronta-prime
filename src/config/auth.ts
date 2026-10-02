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
 * Tentativas por minuto nas Server Actions de acesso.
 * - Por email: protege cada conta mesmo que o atacante troque de IP a cada tentativa.
 * - Por IP: freia quem testa uma senha em muitas contas (só quando o IP é conhecido).
 */
export const RATE_LIMITS_PER_MINUTE = {
  loginPerEmail: 5,
  loginPerIp: 30,
  recoverPerEmail: 3,
  recoverPerIp: 10,
  resetPerIp: 10,
  /** Criar a senha no primeiro acesso (já logada): por conta. */
  firstPasswordPerUser: 5,
} as const;
