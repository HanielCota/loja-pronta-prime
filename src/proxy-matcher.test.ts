import { describe, expect, test } from 'bun:test';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config } from './proxy';

// Confere o matcher com o próprio código do Next: o proxy só deixa de rodar nos arquivos do build
// e nos três ícones, nunca numa página, no login ou nos retornos de OAuth.
const matches = (path: string) =>
  unstable_doesMiddlewareMatch({ config, url: `https://lojaprontaprime.com${path}` });

describe('matcher do proxy', () => {
  test('roda nas páginas, no login e nos retornos de OAuth', () => {
    for (const path of [
      '/',
      '/entrar',
      '/sll/aula/123',
      '/api/auth/sign-in/email',
      '/api/shopee/callback',
      '/api/bling/callback',
      '/brand/logo.svg',
    ])
      expect(matches(path)).toBe(true);
  });

  test('pula só os arquivos do build e os ícones exatos', () => {
    for (const path of [
      '/_next/static/chunks/app.js',
      '/_next/image',
      '/_next/image/x',
      '/favicon.ico',
      '/icon.png',
      '/apple-icon.png',
    ])
      expect(matches(path)).toBe(false);
  });

  test('nomes parecidos com os ícones continuam passando pelo proxy', () => {
    for (const path of ['/favicon.ico/x', '/faviconXico', '/icon.pngfoo', '/_next/staticX'])
      expect(matches(path)).toBe(true);
  });
});
