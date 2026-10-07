import { database, runId } from './support/students';

/** Remove as contas deste teste diretamente do banco; nenhum arquivo foi enviado ao S3. */
export default async function globalTeardown() {
  const db = database();
  const pattern = `e2e-${runId()}-%@teste.com`;
  const { rows } = await db.query<{ id: string }>(`select id from "user" where email like $1`, [
    pattern,
  ]);
  if (rows.length) {
    const ids = rows.map(({ id }) => id);
    await db.query(`delete from verification where value = any($1)`, [ids]);
    await db.query(`delete from "user" where id = any($1)`, [ids]);
  }
  await db.end();
}
