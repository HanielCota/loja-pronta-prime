import { eq } from 'drizzle-orm';
import { isStudentRole } from '@/features/admin/access';
import { db } from '@/server/db';
import { user } from '@/server/db/schema';
import { revokeAccountAccess } from './credential-lifecycle';

/** Invalidate the old credential and leave password creation to the email recovery flow. */
export async function resetStudentForEmailRecovery(userId: string) {
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .for('update');
    if (!target) return 'missing';
    if (!isStudentRole(target.role)) return 'not_student';
    await revokeAccountAccess(tx, userId, true);
    return 'reset';
  });
}
