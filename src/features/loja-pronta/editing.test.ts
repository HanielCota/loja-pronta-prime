import { describe, expect, test } from 'bun:test';
import { canReviseDonePhases } from './editing';

describe('canReviseDonePhases', () => {
  test('reabre até a fase dos produtos', () => {
    for (const phase of [1, 2, 3, 4, 5]) expect(canReviseDonePhases(phase)).toBe(true);
  });

  test('trava a partir da publicação', () => {
    expect(canReviseDonePhases(6)).toBe(false);
    expect(canReviseDonePhases(7)).toBe(false);
  });
});
