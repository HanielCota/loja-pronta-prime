import { expect, test } from 'bun:test';
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server';
import nextConfig from '../../next.config';

// Usa o resolvedor do próprio Next: uma regra geral posterior pode sobrescrever a exceção.
const responseFor = (path: string) =>
  unstable_getResponseFromNextConfig({ url: `https://example.invalid${path}`, nextConfig });

test('retornos OAuth não enviam código e estado no Referer de outra página', async () => {
  for (const path of ['/api/shopee/callback', '/api/bling/callback']) {
    const response = await responseFor(`${path}?code=private-code&state=private-state`);
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
  }
});

test('formulários OAuth permitem os provedores oficiais nas telas correspondentes', async () => {
  const shopee = (await responseFor('/loja-pronta/shopee/conectar')).headers.get(
    'Content-Security-Policy',
  );
  expect(shopee).toContain(
    "form-action 'self' https://open.shopee.com.br https://open.test-stable.shopee.com.br",
  );
  expect(shopee).not.toContain('bling.com.br');
  const bling = (await responseFor('/admin/bling')).headers.get('Content-Security-Policy');
  expect(bling).toContain("form-action 'self' https://www.bling.com.br");
  expect(bling).not.toContain('shopee.com.br');
});

test('as demais rotas preservam a política geral e formulários só para o próprio site', async () => {
  for (const path of [
    '/entrar',
    '/loja-pronta',
    '/api/auth/ok',
    '/api/shopee/callback-extra',
    '/api/bling/callback-extra',
  ]) {
    const response = await responseFor(path);
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('Content-Security-Policy')).toEndWith("form-action 'self'");
  }
});
