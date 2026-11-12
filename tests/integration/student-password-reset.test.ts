import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { auth } from '@/server/auth/auth';
import {
  issueStudentTemporaryPassword,
  resetStudentForEmailRecovery,
} from '@/server/auth/reset-student-password';
import { revokeRetiredPasswords } from '@/server/auth/revoke-retired-passwords';
import { revokeAccountAccess } from '@/server/auth/credential-lifecycle';
import { RETIRED_STUDENT_PASSWORD } from '@/server/auth/student-password';
import { db } from '@/server/db';
import { account, session, user, verification } from '@/server/db/schema';
import { rejection } from '../support/rejection';

const users: string[] = [];
afterAll(async () => {
  if (users.length) {
    // Os links de troca de senha não apontam para a conta por chave estrangeira.
    await db.delete(verification).where(inArray(verification.value, users));
    await db.delete(user).where(inArray(user.id, users));
  }
  await db.$client.end();
});

const personalPassword = 'Original-personal-password!';

async function fixture({
  role = 'user',
  withPassword = true,
  old = false,
  password = personalPassword,
} = {}) {
  const id = randomUUID();
  users.push(id);
  await db.insert(user).values({
    id,
    name: 'Aluna antiga',
    email: `${id}@example.invalid`,
    role,
    mustChangePassword: true,
    emailVerified: true,
    ...(old ? { credentialVersion: null } : {}),
  });
  if (withPassword) {
    await db.insert(account).values({
      id,
      accountId: id,
      providerId: 'credential',
      userId: id,
      password: await hashPassword(password),
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

function credential(id: string) {
  return db.query.account.findFirst({ where: eq(account.userId, id) });
}

test('student reset revokes the password, sessions and reset links and allows email recovery', async () => {
  const id = await fixture();
  const email = `${id}@example.invalid`;
  expect(await resetStudentForEmailRecovery(id)).toBe('reset');
  expect((await credential(id))?.password).toBeNull();
  const saved = await db.query.user.findFirst({ where: eq(user.id, id) });
  expect(saved?.mustChangePassword).toBe(false);
  expect(saved?.emailVerified).toBe(true);
  expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(0);
  expect(await db.select().from(verification).where(eq(verification.value, id))).toHaveLength(0);
  await rejection(auth.api.signInEmail({ body: { email, password: personalPassword } }));
  await auth.api.requestPasswordReset({ body: { email } });
  const token = (await db.query.verification.findFirst({
    where: eq(verification.value, id),
  }))!.identifier.slice('reset-password:'.length);
  const password = 'New-personal-password!';
  await auth.api.resetPassword({ body: { token, newPassword: password } });
  expect((await auth.api.signInEmail({ body: { email, password } })).user.id).toBe(id);
});

test('a student without a credential stays eligible for email recovery', async () => {
  const id = await fixture({ withPassword: false });
  expect(await resetStudentForEmailRecovery(id)).toBe('reset');
  expect(await credential(id)).toBeUndefined();
});

test('temporary recovery replaces credentials and revokes sessions and links', async () => {
  for (const withPassword of [true, false]) {
    const id = await fixture({ withPassword });
    const email = `${id}@example.invalid`;
    const previous = await db.query.user.findFirst({ where: eq(user.id, id) });
    const result = await issueStudentTemporaryPassword(id, previous!.credentialVersion);
    expect(result.status).toBe('reset');
    expect((await issueStudentTemporaryPassword(id, previous!.credentialVersion)).status).toBe(
      'changed',
    );
    const saved = await db.query.user.findFirst({ where: eq(user.id, id) });
    expect(saved?.credentialVersion).not.toBe(previous?.credentialVersion);
    expect(saved?.mustChangePassword).toBe(true);
    expect((await credential(id))?.password).not.toBe(result.password);
    expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(0);
    expect(await db.select().from(verification).where(eq(verification.value, id))).toHaveLength(0);
    await rejection(auth.api.signInEmail({ body: { email, password: personalPassword } }));
    const signedIn = await auth.api.signInEmail({ body: { email, password: result.password! } });
    expect(signedIn.user.id).toBe(id);
    expect(signedIn.user.mustChangePassword).toBe(true);

    const token = randomUUID();
    await db.insert(verification).values({
      id: token,
      identifier: `reset-password:${token}`,
      value: id,
      expiresAt: new Date(Date.now() + 3600000),
    });
    const newPassword = 'My personal password after recovery!';
    await auth.api.resetPassword({ body: { token, newPassword } });
    const recovered = await auth.api.signInEmail({ body: { email, password: newPassword } });
    expect(recovered.user.mustChangePassword).toBe(false);
  }
});

test('temporary recovery requires an active student with a verified email', async () => {
  const admin = await fixture({ role: 'admin', old: true });
  const blocked = await fixture({ old: true });
  const unverified = await fixture({ old: true });
  await db.update(user).set({ banned: true }).where(eq(user.id, blocked));
  await db.update(user).set({ emailVerified: false }).where(eq(user.id, unverified));

  expect((await issueStudentTemporaryPassword(admin, null)).status).toBe('not_student');
  expect((await issueStudentTemporaryPassword(blocked, null)).status).toBe('unavailable');
  expect((await issueStudentTemporaryPassword(unverified, null)).status).toBe('unavailable');
});

test('conta de admin não muda', async () => {
  const id = await fixture({ role: 'admin' });
  const original = await credential(id);
  expect(await resetStudentForEmailRecovery(id)).toBe('not_student');
  expect(await credential(id)).toEqual(original);
  expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(1);
  expect(await db.select().from(verification).where(eq(verification.value, id))).toHaveLength(1);
});

test('conta com função personalizada não muda', async () => {
  const id = await fixture({ role: 'suporte' });
  expect(await resetStudentForEmailRecovery(id)).toBe('not_student');
});

test('conta que não existe', async () => {
  expect(await resetStudentForEmailRecovery(randomUUID())).toBe('missing');
});

test('rollout selectively revokes retired hashes, including previously promoted accounts', async () => {
  const student = await fixture({ old: true, password: RETIRED_STUDENT_PASSWORD });
  const promoted = await fixture({ old: true, role: 'admin', password: RETIRED_STUDENT_PASSWORD });
  const personal = await fixture({ old: true });
  const visitId = randomUUID();
  await db.insert(session).values({
    id: visitId,
    token: visitId,
    userId: personal,
    impersonatedBy: promoted,
    expiresAt: new Date(Date.now() + 86400000),
  });
  const original = await credential(personal);
  await rejection(
    auth.api.signInEmail({
      body: { email: `${student}@example.invalid`, password: RETIRED_STUDENT_PASSWORD },
    }),
  );
  expect(await revokeRetiredPasswords(db, false)).toEqual({ matched: 2, revoked: 0 });
  expect((await credential(student))?.password).toBeTruthy();
  expect(await revokeRetiredPasswords(db, true)).toEqual({ matched: 2, revoked: 2 });
  expect(await revokeRetiredPasswords(db, true)).toEqual({ matched: 0, revoked: 0 });
  for (const id of [student, promoted]) {
    expect((await credential(id))?.password).toBeNull();
    expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(0);
    expect(await db.select().from(verification).where(eq(verification.value, id))).toHaveLength(0);
  }
  expect(await credential(personal)).toEqual(original);
  expect(await db.select().from(session).where(eq(session.userId, personal))).toHaveLength(1);
  expect(await db.select().from(verification).where(eq(verification.value, personal))).toHaveLength(
    1,
  );
});

test('a sign-in already checking the old password cannot mint a session during promotion', async () => {
  const id = await fixture();
  let attempt!: ReturnType<typeof auth.api.signInEmail>;
  await db.transaction(async (tx) => {
    await tx.select({ id: user.id }).from(user).where(eq(user.id, id)).for('update');
    attempt = auth.api.signInEmail({
      body: { email: `${id}@example.invalid`, password: personalPassword },
    });
    void attempt.catch(() => {});
    // The session insert waits for the user's foreign-key lock after the password check.
    const deadline = Date.now() + 3000;
    for (;;) {
      const { rows } = await db.$client.query(
        "select 1 from pg_stat_activity where wait_event_type = 'Lock' and query like 'insert into \"session\"%'",
      );
      if (rows.length) break;
      if (Date.now() > deadline) throw new Error('The sign-in did not reach the session insert.');
      await Bun.sleep(10);
    }
    await tx.update(user).set({ role: 'admin' }).where(eq(user.id, id));
    await revokeAccountAccess(tx, id, true);
  });
  await rejection(attempt);
  expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(0);
});
