import { expect, test } from 'bun:test';
import { isSafeContentDestination, toSafeWebUrl } from './urls';

test.each(['https://exemplo.com/a?b=1#c', 'http://exemplo.com', '/sll', '/sll/../perfil'])(
  'aceita destino válido: %s',
  (value) => {
    expect(isSafeContentDestination(value)).toBe(true);
  },
);

test.each([
  'javascript:alert(1)',
  'data:text/html,<script>',
  '//evil.com',
  '/.//evil.com',
  '/\\evil.com',
  '/sll\n',
  '/sll\u007f',
  'https://nome:senha@exemplo.com',
  'https:\\evil.com',
  'https://exemplo.com\n',
])('recusa destino perigoso: %s', (value) => {
  expect(isSafeContentDestination(value)).toBe(false);
});

test('normaliza somente URL web sem credenciais', () => {
  expect(toSafeWebUrl('https://exemplo.com')).toBe('https://exemplo.com/');
  expect(toSafeWebUrl('/sll')).toBeUndefined();
  expect(toSafeWebUrl('https://exemplo.com/Olá')).toBe('https://exemplo.com/Ol%C3%A1');
});
