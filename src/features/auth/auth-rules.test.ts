import { describe, expect, test } from 'bun:test';
import type { ZxcvbnResult } from '@zxcvbn-ts/core';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/config/auth';
import { suggestEmail } from './email-suggestion';
import { getAuthErrorCode } from './error-codes';
import { needsFirstPassword } from './first-password';
import { authHref } from './links';
import { EMAIL_CONFIRMED_REASON, parseLoginReason } from './login-reason';
import { AUTH_ERROR_MESSAGES, formatHours } from './messages';
import { personalInputs, toStrength } from './password-strength';
import { sanitizeRedirect } from './redirect';
import { emailSchema, loginSchema } from './schemas';

/** Resultado do zxcvbn só com o que toStrength lê. */
const result = (score: number, warning = '', suggestions: string[] = []) =>
  ({ score, feedback: { warning, suggestions } }) as unknown as ZxcvbnResult;

describe('sanitizeRedirect', () => {
  test('aceita caminhos internos, com busca e âncora', () => {
    expect(sanitizeRedirect('/sll')).toBe('/sll');
    expect(sanitizeRedirect('/aulas?x=1#a')).toBe('/aulas?x=1#a');
    expect(sanitizeRedirect('/a/../b')).toBe('/b');
  });

  test('recusa outros sites, barras invertidas e caracteres de controle', () => {
    for (const unsafe of [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      '/.//evil.com',
      '/..//evil.com',
      'evil.com',
      '/ok\tx',
      '/ok\nx',
      '',
      undefined,
    ]) {
      expect(sanitizeRedirect(unsafe)).toBeUndefined();
    }
  });
});

describe('needsFirstPassword', () => {
  test('só quem já criou a senha (false) fica livre', () => {
    expect(needsFirstPassword({ mustChangePassword: false })).toBe(false);
    expect(needsFirstPassword({ mustChangePassword: true })).toBe(true);
    // Sem a marca (contas antigas): pelo lado seguro.
    expect(needsFirstPassword({ mustChangePassword: null })).toBe(true);
    expect(needsFirstPassword({})).toBe(true);
  });
});

describe('códigos de erro', () => {
  test('getAuthErrorCode: válido, desconhecido e vazio', () => {
    expect(getAuthErrorCode(['rate_limited'])).toBe('rate_limited');
    expect(getAuthErrorCode(['algo_novo'])).toBe('unknown');
    expect(getAuthErrorCode(undefined)).toBeUndefined();
    expect(getAuthErrorCode([])).toBeUndefined();
  });

  test('todo código tem mensagem, e nenhuma mensagem fala de "entrar" no erro genérico', () => {
    for (const message of Object.values(AUTH_ERROR_MESSAGES)) expect(message.title).toBeTruthy();
    expect(AUTH_ERROR_MESSAGES.unknown.title).not.toMatch(/entrar/i);
  });
});

describe('parseLoginReason', () => {
  test('motivos conhecidos, link de confirmação vencido e o resto', () => {
    expect(parseLoginReason('sessao-expirada')).toBe('session_expired');
    expect(parseLoginReason('conta-desativada')).toBe('account_disabled');
    expect(parseLoginReason(EMAIL_CONFIRMED_REASON, 'TOKEN_EXPIRED')).toBe(
      'verification_link_invalid',
    );
    expect(parseLoginReason(undefined, 'INVALID_TOKEN')).toBe('verification_link_invalid');
    // Confirmado sem erro não é erro (a tela mostra um aviso positivo).
    expect(parseLoginReason(EMAIL_CONFIRMED_REASON)).toBeUndefined();
    expect(parseLoginReason('inventado')).toBeUndefined();
    expect(parseLoginReason(undefined, 'OUTRO')).toBeUndefined();
  });
});

describe('authHref e formatHours', () => {
  test('leva o destino sem expor mais nada', () => {
    expect(authHref('/entrar')).toBe('/entrar');
    expect(authHref('/entrar', '/sll?a=1')).toBe('/entrar?next=%2Fsll%3Fa%3D1');
  });

  test('singular e plural', () => {
    expect(formatHours(1)).toBe('1 hora');
    expect(formatHours(24)).toBe('24 horas');
  });
});

describe('schemas', () => {
  test('email: sem espaços e em minúsculas', () => {
    expect(emailSchema.parse('  Ana.Souza@Gmail.COM ')).toBe('ana.souza@gmail.com');
    expect(emailSchema.safeParse('ana@').success).toBe(false);
  });

  test('senha: limites de tamanho', () => {
    const base = { email: 'ana@gmail.com' };
    const ok = (password: string) => loginSchema.safeParse({ ...base, password }).success;
    expect(ok('a'.repeat(PASSWORD_MIN_LENGTH))).toBe(true);
    expect(ok('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false);
    expect(ok('a'.repeat(PASSWORD_MAX_LENGTH))).toBe(true);
    expect(ok('a'.repeat(PASSWORD_MAX_LENGTH + 1))).toBe(false);
  });
});

describe('suggestEmail', () => {
  test('corrige domínios comuns digitados errado', () => {
    expect(suggestEmail('ana@gmial.com')).toBe('ana@gmail.com');
    expect(suggestEmail('ana@hotmal.com')).toBe('ana@hotmail.com');
    expect(suggestEmail(' Ana@GMAIL.con ')).toBe('ana@gmail.com');
  });

  test('não sugere quando está certo, é outro domínio ou não é email', () => {
    expect(suggestEmail('ana@gmail.com')).toBeUndefined();
    expect(suggestEmail('ana@minhaempresa.com.br')).toBeUndefined();
    expect(suggestEmail('ana')).toBeUndefined();
    expect(suggestEmail('a@b@c')).toBeUndefined();
    expect(suggestEmail('@gmail.com')).toBeUndefined();
  });
});

describe('força da senha', () => {
  test('abaixo do mínimo: no máximo fraca, com a dica do tamanho', () => {
    const short = 'a'.repeat(PASSWORD_MIN_LENGTH - 1);
    expect(toStrength(result(4), short)).toEqual({
      score: 1,
      tip: `Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    });
  });

  test('boa ou forte: sem dica; fraca: a dica do zxcvbn ou a padrão', () => {
    const long = 'minha loja vai bombar';
    expect(toStrength(result(3), long)).toEqual({ score: 3 });
    expect(toStrength(result(1, 'Senha muito usada.'), long)).toEqual({
      score: 1,
      tip: 'Senha muito usada.',
    });
    expect(toStrength(result(2, '', ['Use mais palavras.']), long).tip).toBe('Use mais palavras.');
    expect(toStrength(result(0), long).tip).toBe('Adicione mais palavras menos comuns.');
  });

  test('dados pessoais: o email inteiro e as partes com 3+ letras', () => {
    expect(personalInputs(['ana.souza@gmail.com'])).toEqual([
      'ana.souza@gmail.com',
      'ana.souza',
      'ana',
      'souza',
      'gmail',
      'com',
    ]);
    expect(personalInputs(['jo@x.io'])).toEqual(['jo@x.io']);
  });
});
