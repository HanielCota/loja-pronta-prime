import { describe, expect, test } from 'bun:test';
import { closedAmount, EXPRESSIONS, mouthShape, PRIORITY, toFaceState } from './face';
import { createReasons } from './reasons';
import { springStep } from './spring';

/** Roda a mola por `seconds` em quadros de `dt`; devolve se assentou e o maior valor visto. */
function simulate(response: number, dt: number, seconds: number) {
  const value = { x: 0 };
  const velocity = { x: 0 };
  let settled = false;
  let peak = 0;
  for (let t = 0; t < seconds && !settled; t += dt) {
    settled = springStep(value, velocity, { x: 1 }, response, dt);
    peak = Math.max(peak, value.x);
  }
  return { settled, peak, value: value.x };
}

describe('springStep', () => {
  test('chega no alvo e diz que assentou', () => {
    const run = simulate(0.3, 1 / 60, 3);
    expect(run.settled).toBe(true);
    expect(run.value).toBeCloseTo(1, 2);
  });

  test('amortecimento crítico: não passa do alvo (sem quique)', () => {
    expect(simulate(0.3, 1 / 60, 3).peak).toBeLessThanOrEqual(1.002);
  });

  test('estável a 30 quadros por segundo, mesmo com a mola rápida do olhar', () => {
    const run = simulate(0.2, 1 / 30, 3);
    expect(Number.isFinite(run.value)).toBe(true);
    expect(run.settled).toBe(true);
  });

  test('valor inválido nunca chega ao desenho: volta pro alvo', () => {
    const value = { x: 0 };
    const velocity = { x: 0 };
    springStep(value, velocity, { x: 0.5 }, 0, 1 / 60);
    expect(value.x).toBe(0.5);
    expect(velocity.x).toBe(0);
  });

  test('tempo de resposta por chave', () => {
    const value = { fast: 0, slow: 0 };
    const velocity = { fast: 0, slow: 0 };
    springStep(value, velocity, { fast: 1, slow: 1 }, (key) => (key === 'fast' ? 0.1 : 1), 0.1);
    expect(value.fast).toBeGreaterThan(value.slow);
  });
});

describe('rosto', () => {
  test('closedAmount: aberto até 0,75, fechado em 1', () => {
    expect(closedAmount(0)).toBe(0);
    expect(closedAmount(0.75)).toBe(0);
    expect(closedAmount(0.875)).toBeCloseTo(0.5);
    expect(closedAmount(1)).toBe(1);
    expect(closedAmount(2)).toBe(1);
  });

  test('toFaceState: uma pálpebra por olho, ou as que vierem de fora', () => {
    const neutral = EXPRESSIONS.neutral;
    expect(toFaceState(neutral)).toMatchObject({ lid0: neutral.lid, lid1: neutral.lid });
    expect(toFaceState(neutral, [1, 0.2])).toMatchObject({ lid0: 1, lid1: 0.2 });
  });

  test('boca: caminho válido em todo o humor, sem NaN', () => {
    for (const mood of [-1, -0.5, 0, 0.25, 0.5, 1]) {
      expect(JSON.stringify(mouthShape(mood))).not.toContain('NaN');
    }
  });

  test('toda expressão com prioridade existe', () => {
    for (const expression of PRIORITY) expect(EXPRESSIONS).toHaveProperty(expression);
  });
});

describe('motivos da expressão', () => {
  test('o de maior prioridade aparece; sem nenhum, a de repouso', () => {
    const reasons = createReasons();
    expect(reasons.current('neutral')).toBe('neutral');
    reasons.set('typing', 'happy');
    reasons.set('error', 'grumpy');
    expect(reasons.current('neutral')).toBe('grumpy');
    reasons.set('celebrate', 'celebrate');
    expect(reasons.current('neutral')).toBe('celebrate');
  });

  test('remover e vencer', async () => {
    const reasons = createReasons();
    expect(reasons.nextExpiry()).toBe(Infinity);
    reasons.set('tap', 'happy', 5);
    expect(reasons.delete('tap')).toBe(true);
    expect(reasons.delete('tap')).toBe(false);

    reasons.set('tap', 'happy', 5);
    expect(reasons.nextExpiry()).toBeLessThan(Infinity);
    await Bun.sleep(15);
    expect(reasons.current('neutral')).toBe('neutral');
  });
});
