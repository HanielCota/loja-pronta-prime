import { storage } from '@/server/storage';
import { database, runId } from './support/students';

/**
 * Remove as alunas desta execução (sessões e contas saem em cascata) e os logos delas no bucket
 * (os de exemplo e os que a IA criou nos testes).
 */
export default async function globalTeardown() {
  const db = database();
  const pattern = `e2e-${runId()}-%@teste.com`;
  const { rows } = await db.query<{ id: string }>(`select id from "user" where email like $1`, [
    pattern,
  ]);
  await Promise.all(
    rows.map(({ id }) => storage().removeAll(`logos/${id.replace(/[^\w-]/g, '')}/`)),
  );
  await db.query(
    `delete from verification where value in (select id from "user" where email like $1)`,
    [pattern],
  );
  await db.query(`delete from "user" where email like $1`, [pattern]);
  await db.end();
}
