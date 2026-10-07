export type MemoryAttempt = { points: number; expire: number };

/** Não descarta limites ativos: ao atingir o teto, novas identidades ficam temporariamente barradas. */
export function countMemoryAttempt(
  memory: Map<string, MemoryAttempt>,
  key: string,
  windowSeconds: number,
  maxEntries: number,
  now: number,
): number {
  let entry = memory.get(key);
  if (!entry && memory.size >= maxEntries) {
    for (const [entryKey, value] of memory) if (value.expire <= now) memory.delete(entryKey);
    if (memory.size >= maxEntries) return Infinity;
  }
  if (!entry || entry.expire <= now) {
    entry = { points: 0, expire: now + windowSeconds * 1000 };
    memory.set(key, entry);
  }
  entry.points += 1;
  return entry.points;
}
