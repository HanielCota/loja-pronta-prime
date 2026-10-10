import { describe, expect, it } from 'bun:test';
import { BlingError, readBlingResource, requestBlingTokens } from './client';
import type { BlingConfiguration } from '../model';

const config: BlingConfiguration = {
  BLING_CLIENT_ID: 'test-client',
  BLING_CLIENT_SECRET: 'test-secret',
  BLING_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
  BLING_EXPECTED_CNPJ: '00000000000000',
  BLING_ENABLED: 'true',
};
const transport = (handler: (url: URL, init: RequestInit) => Response | Promise<Response>) =>
  ((url: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(new URL(String(url)), init ?? {}))) as typeof fetch;

describe('API Bling', () => {
  it('pede JWT com credenciais no cabeçalho e código no corpo', async () => {
    const tokens = await requestBlingTokens(
      config,
      { code: 'secret-code' },
      transport((url, init) => {
        expect(url.href).toBe('https://api.bling.com.br/Api/v3/oauth/token');
        const headers = new Headers(init.headers);
        expect(headers.get('enable-jwt')).toBe('1');
        expect(headers.get('authorization')).toBe(
          `Basic ${Buffer.from('test-client:test-secret').toString('base64')}`,
        );
        expect(init.redirect).toBe('error');
        expect(new URLSearchParams(String(init.body)).get('code')).toBe('secret-code');
        return Response.json({
          access_token: 'test-access',
          refresh_token: 'test-refresh',
          token_type: 'Bearer',
          expires_in: 60,
        });
      }),
    );
    expect(tokens.accessToken).toBe('test-access');
    expect(tokens.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
  it('mantém JWT na renovação e não repete uma falha de rede', async () => {
    let calls = 0;
    await expect(
      requestBlingTokens(
        config,
        { refreshToken: 'refresh' },
        transport((_url, init) => {
          calls++;
          expect(new Headers(init.headers).get('enable-jwt')).toBe('1');
          expect(new URLSearchParams(String(init.body)).get('grant_type')).toBe('refresh_token');
          throw new Error('sensitive remote error');
        }),
      ),
    ).rejects.toThrow('indisponível');
    expect(calls).toBe(1);
  });
  it('consulta só as rotas fixas, com filtros reais e sem token na URL', async () => {
    await readBlingResource(
      'secret-token',
      'channels',
      transport((url, init) => {
        expect(url.pathname).toBe('/Api/v3/canais-venda');
        expect(url.searchParams.get('tipos[]')).toBe('Shopee');
        expect(url.href).not.toContain('secret-token');
        expect(new Headers(init.headers).get('authorization')).toBe('Bearer secret-token');
        return Response.json({ data: [] });
      }),
    );
  });
  it('oculta o corpo de erro, distingue permissões e recusa tokens incompletos', async () => {
    await expect(
      readBlingResource(
        'token',
        'products',
        transport(() => new Response('secret-response', { status: 403 })),
      ),
    ).rejects.toThrow('não tem permissão');
    await expect(
      requestBlingTokens(
        config,
        { code: 'code' },
        transport(() => Response.json({ access_token: 'secret' })),
      ),
    ).rejects.toThrow('confirmar a resposta');
    expect(new BlingError('authorization').message).not.toContain('token');
  });
});
