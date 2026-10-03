import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { stores } from '@/server/db/schema';

/** Fase da loja da aluna na Loja Pronta (1 a 7). Sem loja cadastrada ainda, é a primeira. */
export async function getStorePhase(userId: string): Promise<number> {
  const [store] = await db
    .select({ phase: stores.phase })
    .from(stores)
    .where(eq(stores.userId, userId));
  return store?.phase ?? 1;
}
