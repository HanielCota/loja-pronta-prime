import type { AuthErrorCode } from './error-codes';

/** Motivos que outras partes do sistema podem mandar pro login via `?motivo=`. */
const LOGIN_REASONS: Record<string, AuthErrorCode> = {
  'sessao-expirada': 'session_expired',
  'conta-desativada': 'account_disabled',
};

export function parseLoginReason(value: string | undefined): AuthErrorCode | undefined {
  return value ? LOGIN_REASONS[value] : undefined;
}
