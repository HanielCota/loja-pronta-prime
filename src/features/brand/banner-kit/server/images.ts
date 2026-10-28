import { storage } from '@/server/storage';
import { renderBanner } from './render';
import type { BannerDraft, BannerVariant } from '../model';

type BannerImage = {
  userId: string;
  revision: string;
  fingerprint: string;
  variant: BannerVariant;
  draft: BannerDraft;
  name: string;
  logoKey: string;
};

/** Bounded process cache; callers must authorize the account and revision before every read. */
export function createBannerImageCache({
  readLogo = (key: string) => storage().get(key),
  render = renderBanner,
  now = Date.now,
  maxBytes = 8 * 1024 * 1024,
  maxEntries = 64,
  concurrency = 2,
  maxPending = 16,
  ttlMs = 5 * 60_000,
} = {}) {
  const cached = new Map<string, { bytes: Uint8Array; expiresAt: number }>();
  const pending = new Map<string, Promise<Uint8Array | null>>();
  const waiting: (() => void)[] = [];
  let byteCount = 0;
  let active = 0;

  function remove(key: string) {
    const entry = cached.get(key);
    if (entry) byteCount -= entry.bytes.byteLength;
    cached.delete(key);
  }

  async function generate(input: BannerImage) {
    if (active >= concurrency) await new Promise<void>((resolve) => waiting.push(resolve));
    else active++;
    try {
      const logo = await readLogo(input.logoKey);
      return logo ? await render(input.draft, input.name, logo, input.variant) : null;
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  }

  return async (input: BannerImage): Promise<Uint8Array | null> => {
    const key = JSON.stringify([input.userId, input.revision, input.fingerprint, input.variant]);
    const time = now();
    for (const [oldKey, entry] of cached) if (entry.expiresAt <= time) remove(oldKey);
    const hit = cached.get(key);
    if (hit) {
      cached.delete(key);
      cached.set(key, hit);
      return hit.bytes;
    }
    const known = pending.get(key);
    if (known) return known;
    if (pending.size >= maxPending) throw new Error('Banner generation queue is full.');
    const result = generate(input)
      .then((bytes) => {
        if (bytes && bytes.byteLength <= maxBytes) {
          while (
            cached.size &&
            (cached.size >= maxEntries || byteCount + bytes.byteLength > maxBytes)
          )
            remove(cached.keys().next().value!);
          cached.set(key, { bytes, expiresAt: now() + ttlMs });
          byteCount += bytes.byteLength;
        }
        return bytes;
      })
      .finally(() => pending.delete(key));
    pending.set(key, result);
    return result;
  };
}

export const readBannerImage = createBannerImageCache();
