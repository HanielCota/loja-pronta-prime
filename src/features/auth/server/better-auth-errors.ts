import { isAPIError } from 'better-auth/api';
import type { AuthErrorCode } from '../error-codes';

/** Códigos do Better Auth → códigos de mensagem da tela (messages.ts). */
const BETTER_AUTH_CODES: Record<string, AuthErrorCode> = {
  INVALID_EMAIL_OR_PASSWORD: 'invalid_credentials',
  EMAIL_NOT_VERIFIED: 'email_not_confirmed',
  BANNED_USER: 'account_disabled',
  INVALID_TOKEN: 'reset_link_invalid',
};

export function toAuthErrorCode(error: unknown): AuthErrorCode {
  if (!isAPIError(error)) return 'unknown';
  if (error.statusCode === 429) return 'rate_limited';

  const code = error.body?.code;
  return (code && BETTER_AUTH_CODES[code]) || 'unknown';
}
