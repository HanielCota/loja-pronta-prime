import { Pool } from 'pg';
import { importZeCourse } from '../src/features/ze-mauro/server/import-course';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  const checkOnly = process.argv.includes('--check');
  const summary = await importZeCourse(pool, undefined, checkOnly);
  console.log(JSON.stringify({ checkOnly, ...summary }, null, 2));
} finally {
  await pool.end();
}
