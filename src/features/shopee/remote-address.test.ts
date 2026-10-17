import { expect, test } from 'bun:test';
import { allowedRemoteUrl, isPublicAddress } from './remote-address';

test('bloqueia endereços privados, locais, reservados e IPv4 embutido', () => {
  for (const address of [
    '127.0.0.1',
    '10.1.1.1',
    '172.16.0.1',
    '192.168.0.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
    '2001:db8::1',
  ])
    expect(isPublicAddress(address)).toBe(false);
  expect(isPublicAddress('8.8.8.8')).toBe(true);
  expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
});
test('não aceita redirecionamento implícito por credencial, porta ou host diferente', () => {
  for (const value of [
    'http://images.example.com/a',
    'https://images.example.com@internal.invalid/a',
    'https://images.example.com:8443/a',
    'https://images.example.com.evil.invalid/a',
    'https://127.0.0.1/a',
  ])
    expect(() => allowedRemoteUrl(value, ['images.example.com'])).toThrow();
  expect(allowedRemoteUrl('https://images.example.com/a', ['images.example.com']).hostname).toBe(
    'images.example.com',
  );
});
