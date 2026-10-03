/** Códigos de erro das telas de acesso. O texto de cada um fica em messages.ts. */
const AUTH_ERROR_CODES = [
  'invalid_credentials',
  'email_not_confirmed',
  'rate_limited',
  'account_disabled',
  'session_expired',
  'reset_link_invalid',
  'verification_link_invalid',
  'same_password',
  'unknown',
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

const CODE_SET: ReadonlySet<unknown> = new Set(AUTH_ERROR_CODES);

function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return CODE_SET.has(value);
}

/** Pega o código de erro de tela que a Server Action devolveu em `formErrors`. */
export function getAuthErrorCode(formErrors: string[] | undefined): AuthErrorCode | undefined {
  const code = formErrors?.[0];
  if (code === undefined) return undefined;
  return isAuthErrorCode(code) ? code : 'unknown';
}
