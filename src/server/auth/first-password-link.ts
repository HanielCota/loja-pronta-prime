import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { RESET_LINK_TTL_HOURS } from '@/config/auth';
import { env } from '@/config/env';
import type { db } from '@/server/db';
import { verification } from '@/server/db/schema';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const resetIdentifierPrefix = 'reset-password:';

function firstPasswordVerificationId(userId: string) {
  return `hotmart-first-access:${userId}`;
}

/** The account row stays locked while a retryable, one-use Better Auth link is prepared. */
export async function getFirstPasswordLink(tx: Transaction, userId: string, firstAttempt: boolean) {
  const id = firstPasswordVerificationId(userId);
  const now = Date.now();
  let token: string;
  if (firstAttempt) {
    token = randomBytes(24).toString('base64url');
    await tx.insert(verification).values({
      id,
      identifier: `${resetIdentifierPrefix}${token}`,
      value: userId,
      expiresAt: new Date(now + RESET_LINK_TTL_HOURS * 60 * 60_000),
    });
  } else {
    const saved = await tx.query.verification.findFirst({ where: eq(verification.id, id) });
    if (!saved || saved.expiresAt.getTime() <= now) {
      return null;
    }

    // Reuse the exact link so an uncertain delivery can be retried with the same Resend key.
    token = saved.identifier.slice(resetIdentifierPrefix.length);
  }

  const url = new URL(`/api/auth/reset-password/${token}`, env.BETTER_AUTH_URL);
  url.searchParams.set('callbackURL', '/redefinir-senha');
  return url.href;
}

export async function revokeFirstPasswordLink(tx: Transaction, userId: string) {
  await tx.delete(verification).where(eq(verification.id, firstPasswordVerificationId(userId)));
}
