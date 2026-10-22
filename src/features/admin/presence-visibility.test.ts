import { expect, test } from 'bun:test';
import { canManagePresenceVisibility } from './presence-visibility';

test('presence visibility requires both the designated email and an admin role', () => {
  expect(canManagePresenceVisibility({ email: 'beedfialho@gmail.com', role: 'admin' })).toBe(true);
  expect(canManagePresenceVisibility({ email: ' BEEDFIALHO@gmail.com ', role: 'user,admin' })).toBe(
    true,
  );
  expect(canManagePresenceVisibility({ email: 'other@example.invalid', role: 'admin' })).toBe(
    false,
  );
  expect(canManagePresenceVisibility({ email: 'beedfialho@gmail.com', role: 'user' })).toBe(false);
  expect(canManagePresenceVisibility({ email: 'beedfialho@gmail.com' })).toBe(false);
});
