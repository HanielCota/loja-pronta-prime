import { randomBytes, randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { isStudentRole } from '@/features/admin/access';
import { db } from '@/server/db';
import { account, user } from '@/server/db/schema';
import { revokeAccountAccess } from './credential-lifecycle';

type ResetStatus = 'missing' | 'not_student' | 'unavailable' | 'changed' | 'reset';

/** Invalidate the old credential and leave password creation to the email recovery flow. */
export async function resetStudentForEmailRecovery(userId: string) {
  return resetStudentCredential(userId);
}

export async function issueStudentTemporaryPassword(
  userId: string,
  credentialVersion: string | null,
) {
  const password = randomBytes(12).toString('hex');
  const hash = await hashPassword(password);
  const status = await resetStudentCredential(userId, { hash, credentialVersion });
  return status === 'reset' ? { status: 'reset' as const, password } : { status };
}

async function resetStudentCredential(
  userId: string,
  temporary?: { hash: string; credentialVersion: string | null },
): Promise<ResetStatus> {
  return db.transaction<ResetStatus>(async (tx) => {
    const [target] = await tx
      .select({
        role: user.role,
        banned: user.banned,
        emailVerified: user.emailVerified,
        credentialVersion: user.credentialVersion,
      })
      .from(user)
      .where(eq(user.id, userId))
      .for('update');

    if (!target) {
      return 'missing';
    }

    if (!isStudentRole(target.role)) {
      return 'not_student';
    }

    if (temporary) {
      if (target.banned || !target.emailVerified) {
        return 'unavailable';
      }

      if (target.credentialVersion !== temporary.credentialVersion) {
        return 'changed';
      }

      // Hotmart and imported accounts may not have a credential row yet.
      const updated = await tx
        .update(account)
        .set({ password: temporary.hash })
        .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
        .returning({ id: account.id });

      if (updated.length === 0) {
        await tx.insert(account).values({
          id: randomUUID(),
          accountId: userId,
          userId,
          providerId: 'credential',
          password: temporary.hash,
        });
      }

      await tx.update(user).set({ mustChangePassword: true }).where(eq(user.id, userId));
    }

    await revokeAccountAccess(tx, userId, !temporary);
    return 'reset';
  });
}
