import { describe, expect, it } from 'bun:test';
import { createHmac } from 'node:crypto';
import { decryptShopeeToken, encryptShopeeToken, signShopeeRequest } from './shopee-protocol';

describe('protocolo Shopee', () => {
  it('assina endpoints públicos e de loja com as bases documentadas', () => {
    expect(signShopeeRequest(123, '/api/v2/auth/token/get', 1700000000, 'key')).toBe(
      createHmac('sha256', 'key').update('123/api/v2/auth/token/get1700000000').digest('hex'),
    );
    expect(
      signShopeeRequest(123, '/api/v2/shop/get_shop_info', 1700000000, 'key', {
        accessToken: 'token',
        shopId: 456,
      }),
    ).toBe(
      createHmac('sha256', 'key')
        .update('123/api/v2/shop/get_shop_info1700000000token456')
        .digest('hex'),
    );
    expect(() => signShopeeRequest(123, 'https://example.com', 1700000000, 'key')).toThrow();
  });
  it('cifra com nonce diferente e impede troca de dono, chave e alteração', () => {
    const key = 'ab'.repeat(32);
    const encrypted = encryptShopeeToken('secret', key, 'user-1');
    expect(decryptShopeeToken(encrypted, key, 'user-1')).toBe('secret');
    expect(encryptShopeeToken('secret', key, 'user-1')).not.toBe(encrypted);
    expect(() => decryptShopeeToken(encrypted, key, 'user-2')).toThrow();
    expect(() => decryptShopeeToken(encrypted, 'cd'.repeat(32), 'user-1')).toThrow();
    const changedByte = (Number.parseInt(encrypted.slice(-2), 16) ^ 1)
      .toString(16)
      .padStart(2, '0');
    expect(() =>
      decryptShopeeToken(`${encrypted.slice(0, -2)}${changedByte}`, key, 'user-1'),
    ).toThrow();
    expect(() => encryptShopeeToken('secret', 'short', 'user-1')).toThrow();
  });
});
