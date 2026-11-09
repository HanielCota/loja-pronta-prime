import { randomUUID } from 'node:crypto';
import { verifyPassword } from 'better-auth/crypto';
import { and, asc, eq, gt, isNull } from 'drizzle-orm';
import { hasAdminRole } from '@/features/admin/access';
import type { db } from '@/server/db';
import { account, user } from '@/server/db/schema';
import { revokeAccountAccess } from './credential-lifecycle';
import { RETIRED_STUDENT_PASSWORD } from './student-password';

const BATCH_SIZE = 50;
const VERIFY_CONCURRENCY = 4;

/** A null credential version marks accounts created before the retirement migration. */
export async function revokeRetiredPasswords(database: typeof db, apply: boolean) {
  let cursor: string | undefined;
  let matched = 0;
  let revoked = 0;
  for (;;) {
    const users = await database.query.user.findMany({
      columns: { id: true },
      where: and(isNull(user.credentialVersion), cursor ? gt(user.id, cursor) : undefined),
      orderBy: asc(user.id),
      limit: BATCH_SIZE,
      with: {
        accounts: {
          columns: { id: true, password: true },
          where: eq(account.providerId, 'credential'),
        },
      },
    });
    if (!users.length) return { matched, revoked };
    cursor = users.at(-1)!.id;
    for (let offset = 0; offset < users.length; offset += VERIFY_CONCURRENCY) {
      await Promise.all(
        users.slice(offset, offset + VERIFY_CONCURRENCY).map(async (entry) => {
          const legacy: { id: string; hash: string }[] = [];
          for (const credential of entry.accounts) {
            const hash = credential.password;
            // Older imports may contain no credential or an unusable hash.
            if (
              hash &&
              /^[\da-f]{32}:[\da-f]{128}$/i.test(hash) &&
              (await verifyPassword({ hash, password: RETIRED_STUDENT_PASSWORD }))
            )
              legacy.push({ id: credential.id, hash });
          }
          if (legacy.length) matched++;
          if (!apply) return;
          const changed = await database.transaction(async (tx) => {
            const [current] = await tx
              .select({ role: user.role })
              .from(user)
              .where(and(eq(user.id, entry.id), isNull(user.credentialVersion)))
              .for('update');
            if (!current) return false;
            for (const credential of legacy) {
              // A personal password saved while the hash was being checked must survive.
              await tx
                .update(account)
                .set({ password: null })
                .where(
                  and(
                    eq(account.id, credential.id),
                    eq(account.userId, entry.id),
                    eq(account.password, credential.hash),
                  ),
                );
            }
            if (legacy.length)
              await revokeAccountAccess(tx, entry.id, false, hasAdminRole(current.role));
            else
              await tx
                .update(user)
                .set({ credentialVersion: randomUUID(), updatedAt: user.updatedAt })
                .where(eq(user.id, entry.id));
            return Boolean(legacy.length);
          });
          if (changed) revoked++;
        }),
      );
    }
  }
}
