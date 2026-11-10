import { expect, test } from 'bun:test';
import { storageKeyVersion } from './storage-version';

test('a versão é o nome final do arquivo, sem as pastas do bucket', () => {
  expect(storageKeyVersion('sll/banners/id/abc.webp')).toBe('abc.webp');
  expect(storageKeyVersion('abc.webp')).toBe('abc.webp');
});

test('arquivos diferentes geram versões diferentes', () => {
  expect(storageKeyVersion('sll/a/1.webp')).not.toBe(storageKeyVersion('sll/a/2.webp'));
});
