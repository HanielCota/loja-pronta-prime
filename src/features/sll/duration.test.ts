import { describe, expect, test } from 'bun:test';
import { formatDuration } from './duration';

describe('formatDuration', () => {
  test('menos de uma hora fica em minutos', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(1)).toBe('1 min');
  });

  test('horas cheias sem os minutos', () => {
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(120)).toBe('2 h');
  });

  test('horas e minutos', () => {
    expect(formatDuration(167)).toBe('2 h 47 min');
    expect(formatDuration(61)).toBe('1 h 1 min');
  });

  test('sem duração conhecida, nada', () => {
    expect(formatDuration(0)).toBeNull();
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(undefined)).toBeNull();
    expect(formatDuration(-5)).toBeNull();
    expect(formatDuration(Number.NaN)).toBeNull();
  });

  test('arredonda frações', () => {
    expect(formatDuration(59.6)).toBe('1 h');
  });
});
