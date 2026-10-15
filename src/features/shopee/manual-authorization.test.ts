import { describe, expect, test } from 'bun:test';
import {
  buildShopeeAuthorizationUrl,
  canUseShopee,
  parseManualShopeeCallback,
  shopeeConfigurationSchema,
} from './authorization';

const config = shopeeConfigurationSchema.parse({
  SHOPEE_PARTNER_ID: '123',
  SHOPEE_PARTNER_KEY: 'test-key',
  SHOPEE_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
  SHOPEE_ENABLED: 'true',
  SHOPEE_CALLBACK_MODE: 'manual',
  SHOPEE_REDIRECT_URI: 'https://legacy.example.invalid/favicon.ico',
});
const state = 'cd'.repeat(32);
const returned = () => {
  const url = new URL(config.SHOPEE_REDIRECT_URI!);
  url.search = new URLSearchParams({ state, code: 'one-use-code', shop_id: '456' }).toString();
  return url;
};

describe('retorno manual da autorização Shopee', () => {
  test('mantém o domínio cadastrado e recebe código e estado sem baixar a URL', () => {
    const url = new URL(buildShopeeAuthorizationUrl(config, 'https://new.example.invalid', state));
    expect(url.searchParams.get('redirect_uri')).toBe('https://legacy.example.invalid/favicon.ico');
    expect(parseManualShopeeCallback(returned().toString(), config)).toEqual({
      kind: 'authorize',
      code: 'one-use-code',
      shopId: 456,
      state,
    });
  });

  test('recusa outro domínio, outra rota, credenciais, fragmentos e caracteres de controle', () => {
    for (const address of [
      returned().toString().replace('legacy.example.invalid', 'evil.example.invalid'),
      returned()
        .toString()
        .replace('legacy.example.invalid', 'legacy.example.invalid.evil.invalid'),
      returned().toString().replace('favicon.ico', 'api/shopee/callback'),
      returned().toString().replace('https://', 'http://'),
      returned().toString().replace('https://', 'https://user:password@'),
      returned().toString() + '#fragment',
      returned().toString().replace('one-use-code', 'one-use-\ncode'),
      'not a URL',
      'a'.repeat(6001),
    ])
      expect(parseManualShopeeCallback(address, config)).toBeNull();
  });

  test('exige a configuração manual e um destino HTTPS explícito sem parâmetros', () => {
    expect(
      parseManualShopeeCallback(returned().toString(), {
        ...config,
        SHOPEE_CALLBACK_MODE: 'automatic',
      }),
    ).toBeNull();
    for (const uri of [
      undefined,
      'http://legacy.example.invalid',
      'https://user:password@legacy.example.invalid',
      'https://legacy.example.invalid/?next=elsewhere',
      'https://legacy.example.invalid/#fragment',
    ]) {
      expect(
        shopeeConfigurationSchema.safeParse({ ...config, SHOPEE_REDIRECT_URI: uri }).success,
      ).toBe(false);
    }
  });

  test('não aceita retorno sem estado nem estado duplicado e oculta a mensagem externa', () => {
    const url = returned();
    url.searchParams.delete('state');
    expect(parseManualShopeeCallback(url.toString(), config)).toBeNull();
    url.searchParams.append('state', state);
    url.searchParams.append('state', state);
    expect(parseManualShopeeCallback(url.toString(), config)).toBeNull();
    url.search = new URLSearchParams({ state, error: 'private-message' }).toString();
    expect(parseManualShopeeCallback(url.toString(), config)).toEqual({ state, kind: 'denied' });
  });
});

describe('piloto da Shopee sem acesso administrativo', () => {
  test('mantém a conexão desligada por padrão e o sandbox restrito', () => {
    expect(canUseShopee(null, 'student', 'user')).toBe(false);
    expect(canUseShopee({ ...config, SHOPEE_ENABLED: 'false' }, 'student', 'admin')).toBe(false);
    expect(canUseShopee(config, 'student', 'user')).toBe(true);
    const sandbox = { ...config, SHOPEE_ENVIRONMENT: 'sandbox' as const };
    expect(canUseShopee(sandbox, 'student', 'user')).toBe(false);
    expect(canUseShopee(sandbox, 'owner', 'user,admin')).toBe(true);
  });

  test('o piloto libera só as contas escolhidas, inclusive no sandbox, sem mudar o papel', () => {
    const pilot = { ...config, SHOPEE_PILOT_USER_IDS: ' selected , other ' };
    expect(canUseShopee(pilot, 'selected', 'user')).toBe(true);
    expect(canUseShopee(pilot, 'select', 'user')).toBe(false);
    expect(canUseShopee({ ...pilot, SHOPEE_ENVIRONMENT: 'sandbox' }, 'selected', 'user')).toBe(
      true,
    );
    expect(canUseShopee({ ...pilot, SHOPEE_ENVIRONMENT: 'sandbox' }, 'student', 'user')).toBe(
      false,
    );
  });
});
