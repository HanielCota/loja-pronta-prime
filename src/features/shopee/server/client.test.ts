import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { getShopeeConfiguration, readShopeeJson, requestShopeeTokens } from './client';

const names = [
  'SHOPEE_PARTNER_ID',
  'SHOPEE_PARTNER_KEY',
  'SHOPEE_TOKEN_ENCRYPTION_KEY',
  'SHOPEE_ENVIRONMENT',
  'SHOPEE_ENABLED',
  'SHOPEE_CALLBACK_MODE',
  'SHOPEE_REDIRECT_URI',
  'SHOPEE_PILOT_USER_IDS',
] as const;
const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
beforeEach(() => {
  process.env.SHOPEE_PARTNER_ID = '123';
  process.env.SHOPEE_PARTNER_KEY = 'test-key';
  process.env.SHOPEE_TOKEN_ENCRYPTION_KEY = 'ab'.repeat(32);
  process.env.SHOPEE_ENVIRONMENT = 'live';
  process.env.SHOPEE_ENABLED = 'false';
  delete process.env.SHOPEE_CALLBACK_MODE;
  delete process.env.SHOPEE_REDIRECT_URI;
  delete process.env.SHOPEE_PILOT_USER_IDS;
});
afterEach(() => {
  for (const name of names) {
    const value = previous[name];
    if (value === undefined) {
      delete process.env[name];
      continue;
    }
    process.env[name] = value;
  }
});

// O cliente recebe um transporte de teste; nenhum teste chama a Shopee.
const transport = (handler: (url: string, init: RequestInit) => Response | Promise<Response>) =>
  ((url: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(String(url), init ?? {}))) as typeof fetch;

describe('cliente Shopee', () => {
  it('não chama a API sem configuração completa', async () => {
    delete process.env.SHOPEE_PARTNER_KEY;
    expect(getShopeeConfiguration()).toBeNull();
    let calls = 0;
    await expect(
      requestShopeeTokens(
        { kind: 'authorize', code: 'test-code', shopId: 456 },
        transport(() => {
          calls++;
          return new Response();
        }),
      ),
    ).rejects.toThrow('ainda não está disponível');
    expect(calls).toBe(0);
  });
  it('envia código no corpo e usa a validade retornada pela API', async () => {
    const start = Date.now();
    const tokens = await requestShopeeTokens(
      { kind: 'authorize', code: 'test-code', shopId: 456 },
      transport((url, init) => {
        expect(new URL(url).origin).toBe('https://partner.shopeemobile.com');
        expect(url).not.toContain('test-code');
        expect(JSON.parse(String(init.body))).toEqual({
          partner_id: 123,
          shop_id: 456,
          code: 'test-code',
        });
        expect(init.redirect).toBe('error');
        return Response.json({
          error: '',
          access_token: 'access',
          refresh_token: 'refresh',
          expire_in: 60,
        });
      }),
    );
    expect(tokens.expiresAt.getTime()).toBeGreaterThanOrEqual(start + 60000);
    expect(tokens.refreshToken).toBe('refresh');
  });
  it('aceita a validade no teto de um ano', async () => {
    const tokens = await requestShopeeTokens(
      { kind: 'authorize', code: 'test-code', shopId: 456 },
      transport(() =>
        Response.json({
          error: '',
          access_token: 'access',
          refresh_token: 'refresh',
          expire_in: 366 * 86_400,
        }),
      ),
    );
    expect(Number.isFinite(tokens.expiresAt.getTime())).toBe(true);
  });
  it('renova sem repetir uma operação com resultado desconhecido', async () => {
    let calls = 0;
    await expect(
      requestShopeeTokens(
        { kind: 'refresh', refreshToken: 'old-refresh', shopId: 456 },
        transport((url, init) => {
          calls++;
          expect(new URL(url).pathname).toBe('/api/v2/auth/access_token/get');
          expect(JSON.parse(String(init.body)).refresh_token).toBe('old-refresh');
          throw new Error('network secret');
        }),
      ),
    ).rejects.toThrow('Não foi possível falar');
    expect(calls).toBe(1);
  });
  it('oculta respostas externas e rejeita tokens incompletos', async () => {
    for (const body of [
      { error: 'forbidden', message: 'secret' },
      { error: '', access_token: 'secret', expire_in: 60 },
      { access_token: 'secret', refresh_token: 'secret', expire_in: 60 },
      { error: '', access_token: 'secret', refresh_token: 'secret', expire_in: 0 },
      { error: '', access_token: 'secret', refresh_token: 'secret', expire_in: -1 },
      { error: '', access_token: 'secret', refresh_token: 'secret', expire_in: 1.5 },
      { error: '', access_token: 'secret', refresh_token: 'secret', expire_in: 366 * 86_400 + 1 },
      { error: '', access_token: 'secret', refresh_token: 'secret', expire_in: 1e13 },
    ]) {
      try {
        await requestShopeeTokens(
          { kind: 'authorize', code: 'test-code', shopId: 456 },
          transport(() => Response.json(body)),
        );
        throw new Error('A resposta deveria ter sido recusada.');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(String(error)).not.toContain('secret');
        expect(String(error)).not.toContain('deveria');
      }
    }
  });
  it('trata limite de requisições e indisponibilidade como falha temporária', async () => {
    for (const status of [429, 503])
      await expect(
        requestShopeeTokens(
          { kind: 'authorize', code: 'test-code', shopId: 456 },
          transport(() => new Response('', { status })),
        ),
      ).rejects.toThrow('Tente novamente mais tarde');
  });
});

describe('readShopeeJson', () => {
  it('reads a body up to the byte limit', async () => {
    const body = JSON.stringify({ value: 'a'.repeat(88) });
    expect(body.length).toBe(100);
    expect(await readShopeeJson(new Response(body), 100)).toEqual({ value: 'a'.repeat(88) });
  });

  it('refuses one byte over the limit, counting bytes and not characters', async () => {
    const body = JSON.stringify({ value: 'a'.repeat(89) });
    await expect(readShopeeJson(new Response(body), 100)).rejects.toThrow('resposta');
    // "é" ocupa 2 bytes: 50 caracteres, 100 bytes do valor.
    const accented = JSON.stringify({ value: 'é'.repeat(50) });
    await expect(readShopeeJson(new Response(accented), accented.length)).rejects.toThrow();
  });

  it('turns broken JSON into an invalid response', async () => {
    await expect(readShopeeJson(new Response('{'), 100)).rejects.toThrow();
    await expect(readShopeeJson(new Response(''), 100)).rejects.toThrow();
  });
});
