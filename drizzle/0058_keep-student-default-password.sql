-- Existing students keep their current password without a mandatory first-access change.
-- Apply once through the migration journal; preserve administrative and custom roles.
UPDATE "user"
SET must_change_password = false, updated_at = now()
WHERE COALESCE(role, 'user') = 'user'
  AND must_change_password IS DISTINCT FROM false;
