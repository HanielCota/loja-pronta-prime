import { expect, test } from 'bun:test';
import { isStoreLogoKey } from './store-images';

test.each([
  'logos/student/3ad8e19c-6458-4d2e-b543-f784e9de4651.png',
  'logos/student/legacy-logo.with-note.png',
  'logos/student/journey-test-3ad8e19c-6458-4d2e-b543-f784e9de4651.png',
])('accepts current and legacy PNG names owned by the account: %s', (key) => {
  expect(isStoreLogoKey('student', key)).toBe(true);
});

test.each([
  null,
  undefined,
  '',
  '../invalid.png',
  'logos/another-account/logo.png',
  'logos/student-two/logo.png',
  'logos/student/../another-account/logo.png',
  'logos/student/nested/logo.png',
  'logos/student/logo.svg',
  'logos/student/logo.png?other=1',
  'videos/student/logo.png',
])('rejects unsafe, unrelated, or non-PNG references: %j', (key) => {
  expect(isStoreLogoKey('student', key)).toBe(false);
});

test('matches the existing owner normalization and storage key length limit', () => {
  expect(isStoreLogoKey('student/id', 'logos/studentid/logo.png')).toBe(true);
  expect(isStoreLogoKey('///', 'logos//logo.png')).toBe(false);
  const prefix = 'logos/student/';
  const key = `${prefix}${'x'.repeat(200 - prefix.length - 4)}.png`;
  expect(isStoreLogoKey('student', key)).toBe(true);
  expect(isStoreLogoKey('student', `${prefix}x${key.slice(prefix.length)}`)).toBe(false);
});
