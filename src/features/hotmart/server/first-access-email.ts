import { and, eq, exists, lte, notExists, or } from 'drizzle-orm';
import { mentorshipPurchaseExists } from './mentorship-purchase';
import { EmailDeliveryError, sendFirstPasswordEmail } from '@/server/auth/emails';
import { getFirstPasswordLink } from '@/server/auth/first-password-link';
import { db } from '@/server/db';
import { account, hotmartFirstAccessEmails, studentProducts, user } from '@/server/db/schema';

const retryDelays = [1, 5, 15].map((minutes) => minutes * 60_000);

async function claimFirstAccessEmail() {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [pending] = await tx
      .select()
      .from(hotmartFirstAccessEmails)
      .where(lte(hotmartFirstAccessEmails.nextAttemptAt, now))
      .orderBy(hotmartFirstAccessEmails.nextAttemptAt)
      .limit(1)
      .for('update', { skipLocked: true });
    if (!pending) {
      return null;
    }

    const { userId, email, attempts } = pending;
    const target = eq(hotmartFirstAccessEmails.userId, userId);
    const retryDelay = retryDelays[attempts];
    if (retryDelay === undefined) {
      await tx.delete(hotmartFirstAccessEmails).where(target);
      return null;
    }

    const [student] = await tx
      .select({ id: user.id })
      .from(user)
      .where(
        and(
          eq(user.id, userId),
          eq(user.email, email),
          eq(user.role, 'user'),
          eq(user.banned, false),
          or(
            exists(
              tx
                .select({ id: studentProducts.userId })
                .from(studentProducts)
                .where(eq(studentProducts.userId, userId)),
            ),
            mentorshipPurchaseExists(userId),
          ),
          notExists(
            tx
              .select({ id: account.id })
              .from(account)
              .where(and(eq(account.userId, userId), eq(account.providerId, 'credential'))),
          ),
        ),
      )
      .for('update');
    const url = student ? await getFirstPasswordLink(tx, userId, attempts === 0) : null;
    if (!url) {
      await tx.delete(hotmartFirstAccessEmails).where(target);
      return null;
    }

    // Reserve the attempt before calling Resend so a restart can safely retry the same link.
    const attempt = attempts + 1;
    await tx
      .update(hotmartFirstAccessEmails)
      .set({
        attempts: attempt,
        nextAttemptAt: new Date(Date.now() + retryDelay),
      })
      .where(target);
    return { userId, email, url, attempt };
  });
}

export async function processHotmartFirstAccessEmail(): Promise<void> {
  const claimed = await claimFirstAccessEmail();
  if (!claimed) {
    return;
  }

  const { userId, email, url, attempt } = claimed;
  const target = eq(hotmartFirstAccessEmails.userId, userId);
  try {
    await sendFirstPasswordEmail({ to: email, url });
  } catch (error) {
    const kind = error instanceof Error ? error.name : typeof error;
    console.error(`[hotmart] First-access email attempt ${attempt} failed (${kind}).`);
    if (
      (error instanceof EmailDeliveryError && !error.retryable) ||
      attempt === retryDelays.length
    ) {
      await db.delete(hotmartFirstAccessEmails).where(target);
    }

    return;
  }

  await db.delete(hotmartFirstAccessEmails).where(target);
}
