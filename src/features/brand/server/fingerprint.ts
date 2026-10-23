import { createHash } from 'node:crypto';

export function brandFingerprint(brand: {
  name: string | null;
  description: string | null;
  logoImage: string | null;
}): string {
  return createHash('sha256')
    .update(JSON.stringify([brand.name, brand.description, brand.logoImage]))
    .digest('hex');
}
