import type { AuthErrorCode } from './error-codes';

/** Motivos que outras partes do sistema podem mandar pro login via `?motivo=`. */
const LOGIN_REASONS: Record<string, AuthErrorCode> = {
  'sessao-expirada': 'session_expired',
  'conta-desativada': 'account_disabled',
};

/** Erros que o link de confirmação de email devolve no `?error=` (Better Auth). */
const VERIFICATION_ERRORS = new Set([
  'TOKEN_EXPIRED',
  'INVALID_TOKEN',
  'USER_NOT_FOUND',
  'INVALID_USER',
]);

/** Motivo de aviso que o login mostra antes do primeiro envio (`?motivo=` ou `?error=`). */
export function parseLoginReason(
  reason: string | undefined,
  linkError?: string,
): AuthErrorCode | undefined {
  if (linkError && VERIFICATION_ERRORS.has(linkError)) return 'verification_link_invalid';
  return reason ? LOGIN_REASONS[reason] : undefined;
}

/** O link de confirmação de email deu certo (`?motivo=email-confirmado`). */
export const EMAIL_CONFIRMED_REASON = 'email-confirmado';
