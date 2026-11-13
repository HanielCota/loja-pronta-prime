import { and, eq, isNull, sql } from 'drizzle-orm';
import { hasAdminRole } from '@/features/admin/access';
import { needsFirstPassword } from '@/features/auth/first-password';
import type { db } from '@/server/db';
import { session, user } from '@/server/db/schema';

export type AdminSessionActor = { userId: string; sessionId: string };
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Match the initiating session and use account-before-session lock ordering for writes. */
export async function hasCurrentAdminSession(
  tx: Transaction,
  actor: AdminSessionActor,
): Promise<boolean> {
  const [account] = await tx
    .select({ role: user.role, banned: user.banned, mustChangePassword: user.mustChangePassword })
    .from(user)
    .where(eq(user.id, actor.userId))
    .for('share');
  if (!account || account.banned || needsFirstPassword(account) || !hasAdminRole(account.role)) {
    return false;
  }

  const [active] = await tx
    .select({ id: session.id })
    .from(session)
    .where(
      and(
        eq(session.id, actor.sessionId),
        eq(session.userId, actor.userId),
        isNull(session.impersonatedBy),
        sql`${session.expiresAt} > statement_timestamp() at time zone 'UTC'`,
      ),
    )
    .for('share');
  return Boolean(active);
}
