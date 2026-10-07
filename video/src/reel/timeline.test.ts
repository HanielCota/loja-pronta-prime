import { expect, test } from 'bun:test';
import { FPS } from '../timeline';
import { REEL_DURATION, REEL_SCENES, reelScene } from './timeline';

test('o vídeo curto tem 30 segundos, sem buracos ou sobreposição entre as cenas', () => {
  expect(REEL_DURATION).toBe(30 * FPS);
  let nextFrame = 0;
  for (const scene of REEL_SCENES) {
    const { from, length } = reelScene(scene.id);
    expect(from).toBe(nextFrame);
    expect(Number.isInteger(length)).toBe(true);
    expect(length).toBeGreaterThan(0);
    nextFrame = from + length;
  }
  expect(nextFrame).toBe(REEL_DURATION);
  // O endereço precisa ficar legível no fecho, mesmo para quem assiste sem som.
  expect(reelScene('final').length).toBeGreaterThanOrEqual(2 * FPS);
});
