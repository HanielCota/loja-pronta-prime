export type MemoryAttempt = { points: number; expire: number };

const nextExpiryByMemory = new WeakMap<Map<string, MemoryAttempt>, number>();

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
    if (now < (nextExpiryByMemory.get(memory) ?? -Infinity)) return Infinity;
    let nextExpiry = Infinity;
    for (const [entryKey, value] of memory) {
      if (value.expire <= now) memory.delete(entryKey);
      else nextExpiry = Math.min(nextExpiry, value.expire);
    }
    // A full map cannot free another slot before its earliest remaining expiry.
    nextExpiryByMemory.set(memory, nextExpiry);
    if (memory.size >= maxEntries) return Infinity;
  }
  if (!entry || entry.expire <= now) {
    entry = { points: 0, expire: now + windowSeconds * 1000 };
    memory.set(key, entry);
    nextExpiryByMemory.set(
      memory,
      Math.min(nextExpiryByMemory.get(memory) ?? Infinity, entry.expire),
    );
  }
  entry.points += 1;
  return entry.points;
}
