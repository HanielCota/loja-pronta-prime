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

// Esconder grava uma linha; mostrar de novo é só apagar essa linha.
async function savePresenceVisibility(
  userId: string,
  hiddenBy: string,
  visibility: z.infer<typeof visibilityInput>['visibility'],
) {
  if (visibility === 'hidden') {
    await db.insert(hiddenUserPresence).values({ userId, hiddenBy }).onConflictDoNothing();
    return;
  }
  await db.delete(hiddenUserPresence).where(eq(hiddenUserPresence.userId, userId));
}

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
  await savePresenceVisibility(account.id, session.user.id, parsed.data.visibility);
  revalidatePath('/admin', 'layout');
  redirect('/admin/online?visibility=saved');
}
