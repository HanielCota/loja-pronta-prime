import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { Pool } from 'pg';
import { DEFAULT_STUDENT_PASSWORD } from '../src/server/auth/student-password';

const flags = new Set(process.argv.slice(2));
if ([...flags].some((flag) => !['--apply', '--all-students'].includes(flag))) {
  throw new Error('Usage: bun scripts/set-student-password.ts [--apply] [--all-students]');
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 5_000,
});
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // Lock accounts before inspecting roles or changing credentials, including concurrent resets.
  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM "user"
     WHERE COALESCE(role, 'user') = 'user'
       AND ($1::boolean OR must_change_password IS DISTINCT FROM false)
     ORDER BY id FOR UPDATE`,
    [flags.has('--all-students')],
  );
  console.info(`Eligible student accounts: ${rows.length}. Administrative roles are excluded.`);
  if (!flags.has('--apply')) {
    console.info(
      'Preview only. Pass --apply to replace passwords and revoke sessions and reset links.',
    );
    await client.query('ROLLBACK');
  } else {
    for (const { id } of rows) {
      // A separate salt per student preserves the authentication library's password format.
      const password = await hashPassword(DEFAULT_STUDENT_PASSWORD);
      const updated = await client.query(
        `UPDATE account SET password = $1, updated_at = now()
         WHERE user_id = $2 AND provider_id = 'credential' RETURNING id`,
        [password, id],
      );
      if (!updated.rowCount) {
        await client.query(
          `INSERT INTO account (id, account_id, provider_id, user_id, password)
           VALUES ($1, $2, 'credential', $2, $3)`,
          [randomUUID(), id, password],
        );
      }
      await client.query(
        `UPDATE "user" SET must_change_password = false, email_verified = true, updated_at = now()
         WHERE id = $1`,
        [id],
      );
      await client.query('DELETE FROM session WHERE user_id = $1', [id]);
      await client.query(
        "DELETE FROM verification WHERE value = $1 AND identifier LIKE 'reset-password:%'",
        [id],
      );
    }
    await client.query('COMMIT');
    console.info(
      `Updated ${rows.length} student accounts. No password change is required at first access.`,
    );
  }
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
