import { expect, test } from 'bun:test';
import { isApplicationOrigin } from './request-origin';

test('aceita o domínio público mesmo quando o servidor atende em endereço interno', () => {
  expect(isApplicationOrigin('https://app.example.com', 'https://app.example.com')).toBe(true);
  for (const origin of [
    null,
    'null',
    'http://0.0.0.0:3000',
    'http://app.example.com',
    'https://other.example.com',
    'https://app.example.com:3000',
    'https://app.example.com/path',
  ])
    expect(isApplicationOrigin(origin, 'https://app.example.com')).toBe(false);
});

test('permite os endereços locais somente com a mesma porta e protocolo', () => {
  expect(isApplicationOrigin('http://127.0.0.1:3000', 'http://localhost:3000')).toBe(true);
  expect(isApplicationOrigin('http://[::1]:3000', 'http://localhost:3000')).toBe(true);
  for (const origin of [
    'http://localhost:3001',
    'https://localhost:3000',
    'http://localhost.evil:3000',
  ])
    expect(isApplicationOrigin(origin, 'http://localhost:3000')).toBe(false);
  expect(isApplicationOrigin('http://localhost:3000', 'https://app.example.com')).toBe(false);
});
