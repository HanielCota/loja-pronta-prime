import { randomBytes } from 'node:crypto';
import { auth } from '@/server/auth/auth';
import { assertTestDatabase } from './support/cleanup';
import { database, PASSWORD, studentEmail } from './support/students';

/** Remove somente contas de teste antigas, sem tentar tocar no armazenamento externo. */
async function removeOldDatabaseStudents() {
  const db = database();
  const { rows } = await db.query<{ id: string }>(
    `select id from "user"
     where email like 'e2e-%@teste.com' and created_at < now() - interval '1 hour'`,
  );
  if (!rows.length) return;
  const ids = rows.map(({ id }) => id);
  await db.query(`delete from verification where value = any($1)`, [ids]);
  await db.query(`delete from "user" where id = any($1)`, [ids]);
}

/** Prepara somente o cenário necessário para o fluxo de adicionar ou conectar loja. */
export default async function globalSetup() {
  assertTestDatabase();
  const id = randomBytes(4).toString('hex');
  process.env.E2E_RUN_ID = id;
  const db = database();

  await db.query('delete from rate_limits');
  await removeOldDatabaseStudents();

  for (const kind of ['doisprodutos', 'doisprodutosmontagem', 'doisprodutosrota']) {
    const { user } = await auth.api.createUser({
      body: {
        email: studentEmail(kind),
        password: PASSWORD,
        name: `Ana ${kind}`,
        role: 'user',
        data: { emailVerified: true, mustChangePassword: false },
      },
    });

    await db.query(
      `insert into student_products (user_id, product) values ($1, 'sll'), ($1, 'loja-pronta')`,
      [user.id],
    );

    if (kind === 'doisprodutosmontagem') {
      await db.query(`insert into stores (user_id, phase) values ($1, 2)`, [user.id]);
      await db.query(
        `insert into store_onboarding (user_id, answers, whatsapp, completed_at)
         values ($1, '{}', '11987654321', now())`,
        [user.id],
      );
      await db.query(
        `insert into store_brand (user_id, name, description)
         values ($1, 'Casa da Ana', 'Produtos escolhidos com carinho.')`,
        [user.id],
      );
    }
  }
}
