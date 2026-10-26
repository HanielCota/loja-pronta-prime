import { expect, test } from 'bun:test';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

const responseFor = (host: string, path: string) =>
  proxy(new NextRequest(`https://${host}${path}`, { headers: { host } }));

test('legacy member links preserve their path and query on the canonical host', async () => {
  for (const host of ['lojaprontaprime.com', 'www.lojaprontaprime.com']) {
    for (const path of ['/', '/entrar?next=%2Fsll', '/sll/etapa/2?from=email']) {
      const response = await responseFor(host, path);
      expect(response.status).toBe(308);
      expect(response.headers.get('location')).toBe(`https://membros.escalashop.com.br${path}`);
    }
  }
});

test('legacy OAuth returns preserve authorization parameters without caching or referring them', async () => {
  for (const provider of ['shopee', 'bling']) {
    const path = `/api/${provider}/callback?code=private-code&state=private-state&shop_id=123`;
    const response = await responseFor('lojaprontaprime.com', path);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`https://membros.escalashop.com.br${path}`);
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  }
});

test('previously sent access emails still reach authentication on the new host', async () => {
  const path = '/api/auth/reset-password/private-token?callbackURL=%2Fredefinir-senha';
  const response = await responseFor('lojaprontaprime.com', path);
  expect(response.status).toBe(307);
  expect(response.headers.get('location')).toBe(`https://membros.escalashop.com.br${path}`);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});

test('webhooks, health checks and unrelated APIs stay on the old host', async () => {
  for (const path of ['/api/hotmart/webhook', '/api/health', '/api/presence', '/api']) {
    const response = await responseFor('lojaprontaprime.com', path);
    expect(response.headers.get('location')).toBeNull();
  }
});

test('the new host, leads, marketing site and unknown hosts do not redirect', async () => {
  for (const host of [
    'membros.escalashop.com.br',
    'leads.lojaprontaprime.com',
    'escalashop.com.br',
    'preview.example.invalid',
    'lojaprontaprime.com.attacker.invalid',
  ]) {
    const response = await responseFor(host, '/entrar');
    expect(response.headers.get('location')).toBeNull();
  }
});

test('forwarded host headers cannot trigger a redirect on an unrelated hostname', () => {
  const request = new NextRequest('https://preview.example.invalid/entrar', {
    headers: { host: 'preview.example.invalid', 'x-forwarded-host': 'lojaprontaprime.com' },
  });
  expect(proxy(request).headers.get('location')).toBeNull();
});

test('a path resembling an external URL cannot replace the fixed destination origin', () => {
  const response = responseFor('lojaprontaprime.com', '//attacker.invalid/entrar?from=email');
  const destination = new URL(response.headers.get('location')!);
  expect(destination.origin).toBe('https://membros.escalashop.com.br');
  expect(destination.search).toBe('?from=email');
});
