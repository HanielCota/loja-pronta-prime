import { randomUUID } from 'node:crypto';
import { and, eq, like } from 'drizzle-orm';
import type { db } from '@/server/db';
import { account, session, user, verification } from '@/server/db/schema';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The caller holds the user's row lock throughout the credential or role change. */
export async function revokeAccountAccess(
  tx: Transaction,
  userId: string,
  clearPassword: boolean,
  revokeVisits = false,
) {
  if (clearPassword) {
    await tx
      .update(account)
      .set({ password: null })
      .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
  }
  await tx
    .update(user)
    .set({
      credentialVersion: randomUUID(),
      ...(clearPassword ? { mustChangePassword: false } : {}),
    })
    .where(eq(user.id, userId));
  await tx.delete(session).where(eq(session.userId, userId));
  if (revokeVisits) await tx.delete(session).where(eq(session.impersonatedBy, userId));
  await tx
    .delete(verification)
    .where(and(eq(verification.value, userId), like(verification.identifier, 'reset-password:%')));
}
