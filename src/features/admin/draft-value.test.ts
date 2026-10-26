import { describe, expect, test } from 'bun:test';
import { draftOrLive } from './draft-value';

describe('draft field shown in the editor', () => {
  test('a field cleared in the draft stays cleared', () => {
    expect(draftOrLive(null, 'Publicado')).toBeNull();
  });

  test('a field the draft did not touch shows the published value', () => {
    expect(draftOrLive(undefined, 'Publicado')).toBe('Publicado');
    expect(draftOrLive(undefined, null)).toBeNull();
    expect(draftOrLive(undefined, undefined)).toBeUndefined();
  });

  test('edited values win, including empty text and zero', () => {
    expect(draftOrLive('Novo', 'Publicado')).toBe('Novo');
    expect(draftOrLive('', 'Publicado')).toBe('');
    expect(draftOrLive(0, 5)).toBe(0);
  });
});
