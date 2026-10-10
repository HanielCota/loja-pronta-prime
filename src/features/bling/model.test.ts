import { describe, expect, it } from 'bun:test';
import { blingConfigurationSchema, buildBlingAuthorizationUrl, parseBlingCallback } from './model';

describe('autorização Bling', () => {
  const state = 'ab'.repeat(32);
  it('usa o endereço oficial e devolve o estado sem aceitar outro callback', () => {
    const url = new URL(buildBlingAuthorizationUrl('client-1', state));
    expect(url.origin).toBe('https://www.bling.com.br');
    expect(url.searchParams.get('state')).toBe(state);
    expect(url.searchParams.has('redirect_uri')).toBe(false);
  });
  it('aceita autorização e recusa do usuário', () => {
    expect(parseBlingCallback(new URLSearchParams({ state, code: 'test-code' }))).toEqual({
      state,
      code: 'test-code',
      denied: false,
    });
    expect(parseBlingCallback(new URLSearchParams({ state, error: 'access_denied' }))).toEqual({
      state,
      denied: true,
    });
  });
  it('recusa estado ausente, duplicação, código vazio e parâmetros com controles', () => {
    for (const query of [
      `code=test`,
      `state=${state}&code=`,
      `state=${state}&code=test&code=other`,
      `state=${state}&state=${state}&code=test`,
      `state=${state}&code=%0Atest`,
    ])
      expect(parseBlingCallback(new URLSearchParams(query))).toBeNull();
  });
  it('mantém o piloto desligado e recusa configuração incompleta', () => {
    expect(blingConfigurationSchema.safeParse({}).success).toBe(false);
    expect(
      blingConfigurationSchema.safeParse({
        BLING_CLIENT_ID: 'client',
        BLING_CLIENT_SECRET: 'secret',
        BLING_ENABLED: 'false',
        BLING_EXPECTED_CNPJ: '00000000000000',
        BLING_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
      }).success,
    ).toBe(false);
  });
});
