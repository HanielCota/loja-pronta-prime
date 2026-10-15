import { describe, expect, test } from 'bun:test';
import {
  buildShopeeAuthorizationUrl,
  parseShopeeCallback,
  shopeeApiOrigin,
  shopeeApplicationId,
  shopeeConfigurationSchema,
  shopeeTokenOwner,
} from './authorization';
import { hashShopeeAuthorizationState } from '@/lib/shopee-protocol';

const config = shopeeConfigurationSchema.parse({
  SHOPEE_PARTNER_ID: '123',
  SHOPEE_PARTNER_KEY: 'test-key',
  SHOPEE_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
});
const state = 'cd'.repeat(32);
const params = () => new URLSearchParams({ state, code: 'test-code', shop_id: '456' });

describe('autorização Shopee de uma loja', () => {
  test('usa o portal global do aplicativo, callback fixo e nenhum segredo no link', () => {
    const url = new URL(
      buildShopeeAuthorizationUrl(config, 'https://example.invalid/other?untrusted=1', state),
    );
    expect(url.origin).toBe('https://open.shopee.com');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      partner_id: '123',
      auth_type: 'seller',
      response_type: 'code',
      state,
      redirect_uri: 'https://example.invalid/api/shopee/callback',
    });
    expect(url.toString()).not.toContain('test-key');
    expect(config.SHOPEE_ENABLED).toBe('false');
  });
  test('separa sandbox de produção na autorização, na API e na cifra', () => {
    const sandbox = { ...config, SHOPEE_ENVIRONMENT: 'sandbox' as const };
    expect(
      new URL(buildShopeeAuthorizationUrl(sandbox, 'http://127.0.0.1:3000', state)).origin,
    ).toBe('https://open.sandbox.test-stable.shopee.com');
    expect(shopeeApiOrigin(sandbox)).toBe('https://openplatform.sandbox.test-stable.shopee.sg');
    expect(shopeeApiOrigin(config)).toBe('https://partner.shopeemobile.com');
    expect(shopeeApplicationId(config)).not.toBe(shopeeApplicationId(sandbox));
    expect(shopeeTokenOwner('user', 456, config)).not.toBe(shopeeTokenOwner('user', 456, sandbox));
    expect(shopeeTokenOwner('user', 456, config)).not.toBe(shopeeTokenOwner('other', 456, config));
    expect(shopeeTokenOwner('user', 456, config)).not.toBe(shopeeTokenOwner('user', 789, config));
  });
  test('recusa retorno inseguro, credenciais na origem e estado previsível', () => {
    for (const origin of [
      'http://example.invalid',
      'ftp://localhost',
      'https://user:password@example.invalid',
    ])
      expect(() => buildShopeeAuthorizationUrl(config, origin, state)).toThrow();
    expect(() => buildShopeeAuthorizationUrl(config, 'https://example.invalid', 'short')).toThrow();
  });
  test('valida código e ID sem coerções ambíguas ou parâmetros repetidos', () => {
    expect(parseShopeeCallback(params())).toEqual({
      kind: 'authorize',
      state,
      code: 'test-code',
      shopId: 456,
    });
    for (const name of ['state', 'code', 'shop_id', 'main_account_id', 'error']) {
      const query = params();
      query.append(name, 'one');
      query.append(name, 'two');
      expect(parseShopeeCallback(query)).toBeNull();
    }
    for (const shop of ['0', '-1', '1e3', '1.5', ' 456', '9007199254740992']) {
      const query = params();
      query.set('shop_id', shop);
      expect(parseShopeeCallback(query)).toBeNull();
    }
    for (const code of ['', 'a b', 'a\n', 'a\u0000', 'a'.repeat(2049)]) {
      const query = params();
      query.set('code', code);
      expect(parseShopeeCallback(query)).toBeNull();
    }
  });
  test('recusa e conta principal consomem a intenção sem selecionar lojas', () => {
    expect(
      parseShopeeCallback(new URLSearchParams({ state, error: 'private-external-message' })),
    ).toEqual({ state, kind: 'denied' });
    expect(
      parseShopeeCallback(new URLSearchParams({ state, code: 'code', main_account_id: '123' })),
    ).toEqual({ state, kind: 'main-account' });
    expect(parseShopeeCallback(new URLSearchParams({ code: 'code', shop_id: '123' }))).toBeNull();
  });
  test('hash determinístico guarda apenas o resumo da intenção', () => {
    expect(hashShopeeAuthorizationState(state)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashShopeeAuthorizationState(state)).not.toBe(state);
    expect(hashShopeeAuthorizationState(state)).toBe(hashShopeeAuthorizationState(state));
    expect(hashShopeeAuthorizationState('ef'.repeat(32))).not.toBe(
      hashShopeeAuthorizationState(state),
    );
  });
});
