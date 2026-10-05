import { describe, expect, test } from 'bun:test';
import { colorsIn } from './color-words';

describe('colorsIn', () => {
  test('acha as cores na ordem em que aparecem', () => {
    expect(colorsIn('Rosa e dourado')).toEqual(['#F07AA8', '#D4AF37']);
    expect(colorsIn('Dourado com rosa')).toEqual(['#D4AF37', '#F07AA8']);
  });

  test('sem acento, plural e nomes compostos', () => {
    expect(colorsIn('Lilás')).toEqual(['#C3A3E0']);
    expect(colorsIn('Tons verdes')).toEqual(['#3BA55C']);
    // "azul marinho" é uma cor só (não azul + marinho).
    expect(colorsIn('Azul-marinho e branco')).toEqual(['#1A2A6C', '#FFFFFF']);
  });

  test('palavra dentro de outra não conta', () => {
    expect(colorsIn('Prosa bonita')).toEqual([]);
    expect(colorsIn('Me ajuda a escolher')).toEqual([]);
  });

  test('até 3 cores, sem repetir', () => {
    expect(colorsIn('rosa, azul, verde, amarelo e rosa')).toHaveLength(3);
    expect(colorsIn('ouro e dourado')).toEqual(['#D4AF37']);
  });
});
