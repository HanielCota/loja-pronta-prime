import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/server/db/schema';
import { revokeRetiredPasswords } from '../src/server/auth/revoke-retired-passwords';

const flags = process.argv.slice(2);
if (flags.some((flag) => flag !== '--apply'))
  throw new Error('Usage: bun scripts/set-student-password.ts [--apply]');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
try {
  const apply = flags.includes('--apply');
  const result = await revokeRetiredPasswords(drizzle(pool, { schema }), apply);
  console.info(
    apply
      ? `Retired credentials revoked: ${result.revoked}.`
      : `Accounts with the retired password: ${result.matched}. Pass --apply to revoke access.`,
  );
} finally {
  await pool.end();
}
