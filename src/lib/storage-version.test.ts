import { describe, expect, test } from 'bun:test';
import { storageKeyVersion, versionedSrc } from './storage-version';

describe('storageKeyVersion', () => {
  test('a versão é o nome final do arquivo, sem as pastas do bucket', () => {
    expect(storageKeyVersion('sll/banners/id/abc.webp')).toBe('abc.webp');
    expect(storageKeyVersion('abc.webp')).toBe('abc.webp');
  });

  test('arquivos diferentes geram versões diferentes', () => {
    expect(storageKeyVersion('sll/a/1.webp')).not.toBe(storageKeyVersion('sll/a/2.webp'));
  });
});

describe('versionedSrc', () => {
  test('junta a versão como parâmetro único da URL', () => {
    const url = new URL(versionedSrc('/api/sll/banner/id', 'a&b=1.webp'), 'https://exemplo.com');
    expect(url.pathname).toBe('/api/sll/banner/id');
    expect(url.searchParams.get('v')).toBe('a&b=1.webp');
    expect(url.searchParams.has('b')).toBe(false);
  });

  test('sem versão, mantém o endereço sem parâmetro', () => {
    expect(versionedSrc('/api/sll/material/id', null)).toBe('/api/sll/material/id');
    expect(versionedSrc('/api/sll/material/id', '')).toBe('/api/sll/material/id');
  });
});
