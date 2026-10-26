import { expect, test } from 'bun:test';
import { brandFingerprint } from './fingerprint';

test('each publishable brand field participates in the approval fingerprint', () => {
  const brand = { name: 'Store', description: 'Description', logoImage: 'logos/owner/one.png' };
  const fingerprint = brandFingerprint(brand);
  expect(brandFingerprint({ ...brand })).toBe(fingerprint);
  for (const field of ['name', 'description', 'logoImage'] as const) {
    expect(brandFingerprint({ ...brand, [field]: 'Changed' })).not.toBe(fingerprint);
  }
});
