import { asc, eq, notExists } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/server/db';
import { hiddenUserPresence, user, userPresence } from '@/server/db/schema';
import { canManagePresenceVisibility } from '../presence-visibility';
import { requireAdmin } from './access';

/** Applied in SQL before pagination or counts, including account-level presence reads. */
export function visiblePresenceCondition() {
  return notExists(
    db
      .select({ userId: hiddenUserPresence.userId })
      .from(hiddenUserPresence)
      .where(eq(hiddenUserPresence.userId, userPresence.userId)),
  );
}

export async function requirePresenceVisibilityOwner() {
  const session = await requireAdmin('/admin/online');
  if (!canManagePresenceVisibility(session.user)) notFound();
  return session;
}

export async function getHiddenPresenceAccounts() {
  await requirePresenceVisibilityOwner();
  return db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(hiddenUserPresence)
    .innerJoin(user, eq(user.id, hiddenUserPresence.userId))
    .orderBy(asc(user.name), asc(user.id));
}
