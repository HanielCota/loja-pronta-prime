import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { auth } from '@/server/auth/auth';
import { db } from '@/server/db';
import { account, session, user } from '@/server/db/schema';
import { changeOwnPassword } from '@/features/auth/server/password';

const users: string[] = [];
const currentPassword = 'senha atual da compradora';
const newPassword = 'uma nova senha da compradora';
afterAll(async () => {
  if (users.length) await db.delete(user).where(inArray(user.id, users));
  await db.$client.end();
});
async function fixture() {
  const id = randomUUID(),
    keepToken = randomUUID(),
    otherToken = randomUUID();
  users.push(id);
  const context = await auth.$context;
  const hash = await context.password.hash(currentPassword);
  await db
    .insert(user)
    .values({ id, name: 'Compradora', email: `${id}@example.invalid`, mustChangePassword: false });
  await db
    .insert(account)
    .values({ id, accountId: id, providerId: 'credential', userId: id, password: hash });
  await db.insert(session).values(
    [keepToken, otherToken].map((token) => ({
      id: token,
      token,
      userId: id,
      expiresAt: new Date(Date.now() + 86400000),
    })),
  );
  return { id, keepToken, otherToken, hash, context };
}
test('troca a senha e encerra os outros aparelhos preservando a sessão atual', async () => {
  const item = await fixture();
  expect(await changeOwnPassword(item.id, item.keepToken, currentPassword, newPassword)).toBeNull();
  const credential = await db.query.account.findFirst({ where: eq(account.id, item.id) });
  expect(
    await item.context.password.verify({ hash: credential!.password!, password: newPassword }),
  ).toBe(true);
  expect(
    await item.context.password.verify({ hash: credential!.password!, password: currentPassword }),
  ).toBe(false);
  expect(
    (
      await db.select({ token: session.token }).from(session).where(eq(session.userId, item.id))
    ).map((row) => row.token),
  ).toEqual([item.keepToken]);
});
test('se a revogação falhar, a senha e todas as sessões permanecem como antes', async () => {
  const item = await fixture();
  await db.$client.query(
    "create function reject_test_session_delete() returns trigger language plpgsql as $$ begin raise exception 'test revocation failure'; end $$",
  );
  await db.$client.query(
    'create trigger reject_test_session_delete before delete on session for each row execute function reject_test_session_delete()',
  );
  try {
    await expect(
      changeOwnPassword(item.id, item.keepToken, currentPassword, newPassword),
    ).rejects.toThrow();
    expect((await db.query.account.findFirst({ where: eq(account.id, item.id) }))?.password).toBe(
      item.hash,
    );
    expect(await db.select().from(session).where(eq(session.userId, item.id))).toHaveLength(2);
  } finally {
    await db.$client.query('drop trigger reject_test_session_delete on session');
    await db.$client.query('drop function reject_test_session_delete()');
  }
});
test('senha atual incorreta não altera a conta nem encerra sessões', async () => {
  const item = await fixture();
  expect(await changeOwnPassword(item.id, item.keepToken, 'senha incorreta', newPassword)).toBe(
    'wrong_current_password',
  );
  expect((await db.query.account.findFirst({ where: eq(account.id, item.id) }))?.password).toBe(
    item.hash,
  );
  expect(await db.select().from(session).where(eq(session.userId, item.id))).toHaveLength(2);
});
test('sessão encerrada não pode trocar a senha mesmo conhecendo a atual', async () => {
  const item = await fixture();
  await db.delete(session).where(eq(session.token, item.keepToken));
  expect(await changeOwnPassword(item.id, item.keepToken, currentPassword, newPassword)).toBe(
    'session_expired',
  );
  expect((await db.query.account.findFirst({ where: eq(account.id, item.id) }))?.password).toBe(
    item.hash,
  );
});

test('uma troca concorrente invalida a senha conferida antes da espera', async () => {
  const item = await fixture();
  const concurrentHash = await item.context.password.hash('senha salva pela outra operação');
  const blocker = await db.$client.connect();
  let pending: ReturnType<typeof changeOwnPassword> | undefined;
  try {
    await blocker.query('begin');
    await blocker.query('select id from "user" where id=$1 for update', [item.id]);
    pending = changeOwnPassword(item.id, item.keepToken, currentPassword, newPassword);
    const deadline = Date.now() + 5000;
    let waiting = false;
    while (Date.now() < deadline) {
      const result = await db.$client.query(
        "select 1 from pg_stat_activity where datname=current_database() and wait_event='transactionid'",
      );
      if (result.rowCount) {
        waiting = true;
        break;
      }
      await Bun.sleep(20);
    }
    expect(waiting).toBe(true);
    await blocker.query('update account set password=$1 where id=$2', [concurrentHash, item.id]);
    await blocker.query('commit');
    expect(await pending).toBe('wrong_current_password');
    expect((await db.query.account.findFirst({ where: eq(account.id, item.id) }))?.password).toBe(
      concurrentHash,
    );
    expect(await db.select().from(session).where(eq(session.userId, item.id))).toHaveLength(2);
  } finally {
    await blocker.query('rollback');
    blocker.release();
    await pending?.catch(() => {});
  }
}, 15_000);
