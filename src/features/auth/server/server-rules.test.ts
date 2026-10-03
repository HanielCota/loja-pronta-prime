import { describe, expect, test } from 'bun:test';
import { APIError } from 'better-auth/api';
import { toAuthErrorCode } from './better-auth-errors';
import { resolvePostLoginPath } from './post-login';

const apiError = (code: string, status: 'UNAUTHORIZED' | 'FORBIDDEN' = 'UNAUTHORIZED') =>
  new APIError(status, { code, message: code });

describe('resolvePostLoginPath', () => {
  test('destino pedido, ou o início', () => {
    expect(resolvePostLoginPath('/sll')).toBe('/sll');
    expect(resolvePostLoginPath(undefined)).toBe('/');
    expect(resolvePostLoginPath('//evil.com')).toBe('/');
  });

  test('com senha temporária, passa antes pelo primeiro acesso (levando o destino)', () => {
    expect(resolvePostLoginPath('/sll', { mustChangePassword: true })).toBe(
      '/primeiro-acesso?next=%2Fsll',
    );
    expect(resolvePostLoginPath(undefined, { mustChangePassword: true })).toBe('/primeiro-acesso');
  });
});

describe('toAuthErrorCode', () => {
  test('toAuthErrorCode: códigos do Better Auth viram mensagens da tela', () => {
    expect(toAuthErrorCode(apiError('INVALID_EMAIL_OR_PASSWORD'))).toBe('invalid_credentials');
    expect(toAuthErrorCode(apiError('EMAIL_NOT_VERIFIED', 'FORBIDDEN'))).toBe(
      'email_not_confirmed',
    );
    expect(toAuthErrorCode(apiError('BANNED_USER', 'FORBIDDEN'))).toBe('account_disabled');
    expect(toAuthErrorCode(apiError('INVALID_TOKEN'))).toBe('reset_link_invalid');
    expect(toAuthErrorCode(new APIError('TOO_MANY_REQUESTS'))).toBe('rate_limited');
    expect(toAuthErrorCode(apiError('CODIGO_NOVO'))).toBe('unknown');
    expect(toAuthErrorCode(new Error('banco caiu'))).toBe('unknown');
  });
});
