import { describe, expect, test } from 'bun:test';
import { formatWhatsapp, parseWhatsapp } from './whatsapp';

describe('parseWhatsapp e formatWhatsapp', () => {
  test('aceita qualquer formato com DDD e guarda só os dígitos', () => {
    expect(parseWhatsapp('(11) 98765-4321')).toBe('11987654321');
    expect(parseWhatsapp('+55 11 98765 4321')).toBe('11987654321');
    expect(parseWhatsapp('5511987654321')).toBe('11987654321');
    expect(parseWhatsapp('11 3456-7890')).toBe('1134567890');
  });

  test('recusa número curto, longo ou com DDD começando em 0', () => {
    expect(parseWhatsapp('98765-4321')).toBeUndefined();
    expect(parseWhatsapp('119876543210')).toBeUndefined();
    expect(parseWhatsapp('01198765432')).toBeUndefined();
    expect(parseWhatsapp('')).toBeUndefined();
  });

  test('formata celular e fixo', () => {
    expect(formatWhatsapp('11987654321')).toBe('(11) 98765-4321');
    expect(formatWhatsapp('1134567890')).toBe('(11) 3456-7890');
  });
});
