import { database, runId } from './support/students';

/** Remove as alunas desta execução (sessões e contas saem em cascata). */
export default async function globalTeardown() {
  const db = database();
  const pattern = `e2e-${runId()}-%@teste.com`;
  await db.query(
    `delete from verification where value in (select id from "user" where email like $1)`,
    [pattern],
  );
  await db.query(`delete from "user" where email like $1`, [pattern]);
  await db.end();
}
