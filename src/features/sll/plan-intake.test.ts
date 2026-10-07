import { describe, expect, test } from 'bun:test';
import { isSllPlanStoreAge } from './plan-intake';

describe('entrada do plano', () => {
  test('aceita as três opções e recusa respostas adulteradas', () => {
    for (const age of ['under_7_days', 'exactly_7_days', 'over_7_days']) {
      expect(isSllPlanStoreAge(age)).toBe(true);
    }
    for (const age of [null, undefined, '', 7, '7', 'OVER_7_DAYS', [], {}, new File([], 'age')]) {
      expect(isSllPlanStoreAge(age)).toBe(false);
    }
  });
});
