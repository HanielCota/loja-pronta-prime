import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/server/db';
import { sllPlanIntake } from '@/server/db/schema';

export type { SllPlanStoreAge } from '../plan-intake';

/** A resposta pertence à aluna; não há uma loja Shopee conectada para associá-la no modelo atual. */
export const getSllPlanIntake = cache(async (userId: string) => {
  const [intake] = await db
    .select({ storeAge: sllPlanIntake.storeAge })
    .from(sllPlanIntake)
    .where(eq(sllPlanIntake.userId, userId))
    .limit(1);
  return intake ?? null;
});
