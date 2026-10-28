import { expect, test } from 'bun:test';
import { countMemoryAttempt, type MemoryAttempt } from './rate-limit-memory';

test('conta tentativas e reabre a janela vencida', () => {
  const memory = new Map<string, MemoryAttempt>();
  expect(countMemoryAttempt(memory, 'a', 60, 2, 0)).toBe(1);
  expect(countMemoryAttempt(memory, 'a', 60, 2, 1)).toBe(2);
  expect(countMemoryAttempt(memory, 'a', 60, 2, 60_000)).toBe(1);
});

test('limita novas identidades sem apagar contadores ativos', () => {
  const memory = new Map<string, MemoryAttempt>();
  countMemoryAttempt(memory, 'a', 60, 2, 0);
  countMemoryAttempt(memory, 'b', 60, 2, 1000);
  expect(countMemoryAttempt(memory, 'c', 60, 2, 2000)).toBe(Infinity);
  expect(memory.size).toBe(2);
  expect(countMemoryAttempt(memory, 'a', 60, 2, 3000)).toBe(2);
  expect(countMemoryAttempt(memory, 'c', 60, 2, 60_000)).toBe(1);
  expect(memory.has('a')).toBe(false);
  expect(memory.get('b')?.points).toBe(1);
  expect(memory.size).toBe(2);
});

test('a saturated map is scanned only when an entry can expire', () => {
  const memory = new Map<string, MemoryAttempt>([
    ['a', { points: 1, expire: 60_000 }],
    ['b', { points: 1, expire: 90_000 }],
  ]);
  const iterate = memory[Symbol.iterator].bind(memory);
  let scans = 0;
  memory[Symbol.iterator] = () => {
    scans++;
    return iterate();
  };
  for (let index = 0; index < 20_000; index++)
    expect(countMemoryAttempt(memory, `new-${index}`, 60, 2, 1000)).toBe(Infinity);
  expect(scans).toBe(1);
  expect(countMemoryAttempt(memory, 'new', 10, 2, 60_000)).toBe(1);
  expect(scans).toBe(2);
  expect(countMemoryAttempt(memory, 'later', 60, 2, 70_000)).toBe(1);
  expect(scans).toBe(3);
  expect(memory.get('b')?.points).toBe(1);
});
