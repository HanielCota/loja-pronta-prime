'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { hiddenUserPresence, user } from '@/server/db/schema';
import { requirePresenceVisibilityOwner } from './presence-visibility';

const visibilityInput = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  visibility: z.enum(['hidden', 'visible']),
});

export async function changePresenceVisibility(form: FormData): Promise<void> {
  const session = await requirePresenceVisibilityOwner();
  const parsed = visibilityInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/admin/online?visibility=invalid');
  const [account] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, parsed.data.email))
    .limit(1);
  if (!account) redirect('/admin/online?visibility=missing');
  if (parsed.data.visibility === 'hidden') {
    await db
      .insert(hiddenUserPresence)
      .values({ userId: account.id, hiddenBy: session.user.id })
      .onConflictDoNothing();
  } else {
    await db.delete(hiddenUserPresence).where(eq(hiddenUserPresence.userId, account.id));
  }
  revalidatePath('/admin', 'layout');
  redirect('/admin/online?visibility=saved');
}
