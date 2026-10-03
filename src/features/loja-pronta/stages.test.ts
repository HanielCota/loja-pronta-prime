import { describe, expect, test } from 'bun:test';
import { STORE_PHASES, STORE_STAGES } from '@/config/store-phases';
import { stageNumber, storeStages } from './stages';

describe('etapas', () => {
  test('toda fase está em exatamente uma etapa, na ordem', () => {
    const phases: number[] = STORE_STAGES.flatMap((stage) => [...stage.phases]);
    expect(phases).toEqual(STORE_PHASES.map((_, index) => index + 1));
  });

  test('etapa de cada fase', () => {
    expect(stageNumber(1)).toBe(1);
    expect(stageNumber(2)).toBe(2);
    expect(stageNumber(3)).toBe(3);
    expect(stageNumber(6)).toBe(3);
  });

  test('fase 1: a primeira é a atual, as outras vêm depois', () => {
    expect(storeStages(1).map((stage) => stage.status)).toEqual(['current', 'next', 'next']);
  });

  test('fase 4: duas feitas, e a atual diz em que passo está', () => {
    const stages = storeStages(4);
    expect(stages.map((stage) => stage.status)).toEqual(['done', 'done', 'current']);
    expect(stages[2]?.step).toBe('Passo 2 de 5: Conexão com a Shopee');
    expect(stages[1]?.step).toBeUndefined();
  });

  test('loja no ar: tudo feito', () => {
    expect(storeStages(STORE_PHASES.length).every((stage) => stage.status === 'done')).toBe(true);
  });
});
