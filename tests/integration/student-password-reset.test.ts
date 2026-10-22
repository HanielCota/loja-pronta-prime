import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { auth } from '@/server/auth/auth';
import { resetStudentToInitialPassword } from '@/server/auth/reset-student-password';
import { DEFAULT_STUDENT_PASSWORD } from '@/server/auth/student-password';
import { db } from '@/server/db';
import { account, session, user, verification } from '@/server/db/schema';

const users: string[] = [];
afterAll(async () => {
  if (users.length) {
    // Os links de troca de senha não apontam para a conta por chave estrangeira.
    await db.delete(verification).where(inArray(verification.value, users));
    await db.delete(user).where(inArray(user.id, users));
  }
  await db.$client.end();
});

async function fixture({ role = 'user', withPassword = true } = {}) {
  const id = randomUUID();
  users.push(id);
  await db.insert(user).values({
    id,
    name: 'Aluna antiga',
    email: `${id}@example.invalid`,
    role,
    mustChangePassword: true,
    emailVerified: false,
  });
  if (withPassword) {
    const context = await auth.$context;
    await db.insert(account).values({
      id,
      accountId: id,
      providerId: 'credential',
      userId: id,
      password: await context.password.hash('senha aleatoria que ninguem sabe'),
    });
  }
  await db
    .insert(session)
    .values({ id, token: id, userId: id, expiresAt: new Date(Date.now() + 86400000) });
  await db.insert(verification).values({
    id,
    identifier: `reset-password:${id}`,
    value: id,
    expiresAt: new Date(Date.now() + 3600000),
  });
  return id;
}

async function initialPasswordWorks(id: string) {
  const context = await auth.$context;
  const credential = await db.query.account.findFirst({ where: eq(account.userId, id) });
  if (!credential?.password) return false;
  return context.password.verify({ hash: credential.password, password: DEFAULT_STUDENT_PASSWORD });
}

test('aluna com senha aleatória volta para a senha inicial, sem sessões nem links abertos', async () => {
  const id = await fixture();
  expect(await resetStudentToInitialPassword(id)).toBe('reset');
  expect(await initialPasswordWorks(id)).toBe(true);
  const saved = await db.query.user.findFirst({ where: eq(user.id, id) });
  expect(saved?.mustChangePassword).toBe(false);
  expect(saved?.emailVerified).toBe(true);
  expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(0);
  expect(await db.select().from(verification).where(eq(verification.value, id))).toHaveLength(0);
});

test('aluna sem acesso por senha ganha a senha inicial', async () => {
  const id = await fixture({ withPassword: false });
  expect(await resetStudentToInitialPassword(id)).toBe('reset');
  expect(await initialPasswordWorks(id)).toBe(true);
});

test('conta de admin não muda', async () => {
  const id = await fixture({ role: 'admin' });
  expect(await resetStudentToInitialPassword(id)).toBe('not_student');
  expect(await initialPasswordWorks(id)).toBe(false);
  expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(1);
  expect(await db.select().from(verification).where(eq(verification.value, id))).toHaveLength(1);
});

test('conta com função personalizada não muda', async () => {
  const id = await fixture({ role: 'suporte' });
  expect(await resetStudentToInitialPassword(id)).toBe('not_student');
  expect(await initialPasswordWorks(id)).toBe(false);
});

test('conta que não existe', async () => {
  expect(await resetStudentToInitialPassword(randomUUID())).toBe('missing');
});
