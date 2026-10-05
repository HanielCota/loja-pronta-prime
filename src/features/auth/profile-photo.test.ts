import { describe, expect, test } from 'bun:test';
import { profilePhotoId, profilePhotoKey, profilePhotoUrl } from './profile-photo';

const id = '12345678-1234-4234-8234-123456789abc';

describe('caminhos da foto de perfil', () => {
  test('só reconhece as URLs criadas pelo sistema', () => {
    expect(profilePhotoId(profilePhotoUrl(id))).toBe(id);
    expect(profilePhotoKey('aluna-1', id)).toBe(`avatars/aluna-1/${id}.webp`);
    for (const url of [
      null,
      undefined,
      '',
      `https://outro.com/perfil/foto/${id}`,
      '/perfil/foto/../outra',
      `/perfil/foto/${id}?x=1`,
    ]) {
      expect(profilePhotoId(url)).toBeNull();
    }
    expect(() => profilePhotoKey('aluna-1', '../outra')).toThrow();
  });
});
