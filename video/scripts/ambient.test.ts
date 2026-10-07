import { expect, test } from 'bun:test';
import { REEL_DURATION } from '../src/reel/timeline';
import { FPS } from '../src/timeline';
import { ambient } from './ambient';
import { RATE } from './dsp';

test('a trilha cobre o vídeo, tem som finito nos dois canais e termina sem estalo', () => {
  const sound = ambient();
  const expectedLength = (REEL_DURATION / FPS) * RATE;
  for (const channel of [sound.left, sound.right]) {
    expect(channel.length).toBe(expectedLength);
    let peak = 0;
    for (const sample of channel) {
      if (!Number.isFinite(sample)) throw new Error('A trilha contém uma amostra inválida.');
      peak = Math.max(peak, Math.abs(sample));
    }
    expect(peak).toBeGreaterThan(0.01);
    expect(peak).toBeLessThanOrEqual(1);
    expect(channel[0]).toBe(0);
    expect(Math.abs(channel.at(-1)!)).toBeLessThan(0.0001);
  }
}, 30_000);
