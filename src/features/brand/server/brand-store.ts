import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/server/db';
import { storeBrand } from '@/server/db/schema';
import type { BrandDraft } from '../steps';

/**
 * A marca no banco: ler e gravar. Só guarda e devolve; quem pode mudar o quê é decidido nas
 * guardas (brand.ts) e nas actions.
 */

/** `updatedAt`: muda a cada escolha salva, pra imagem do logo salvo não vir velha do cache. */
export type Brand = BrandDraft & {
  completedAt: Date | null;
  publicationFingerprint: string | null;
  updatedAt: Date | null;
};

const EMPTY: Brand = {
  name: null,
  logoImage: null,
  description: null,
  completedAt: null,
  publicationFingerprint: null,
  updatedAt: null,
};

/** A marca como está (sem linha: nada escolhido ainda). Lida uma vez por requisição. */
export const getBrand = cache(async (userId: string): Promise<Brand> => {
  const [row] = await db
    .select({
      name: storeBrand.name,
      logoImage: storeBrand.logoImage,
      description: storeBrand.description,
      completedAt: storeBrand.completedAt,
      publicationFingerprint: storeBrand.publicationFingerprint,
      updatedAt: storeBrand.updatedAt,
    })
    .from(storeBrand)
    .where(eq(storeBrand.userId, userId));
  return row ?? EMPTY;
});

export type BrandPatch = Partial<
  Pick<typeof storeBrand.$inferInsert, 'name' | 'logoImage' | 'description'>
>;

/**
 * Grava só o que mudou, criando a linha na primeira escolha. Quem chama já conferiu o acesso
 * (e, no logo, que a imagem é dela).
 */
export async function saveBrand(userId: string, patch: BrandPatch) {
  await db
    .insert(storeBrand)
    .values({ userId, ...patch, publicationFingerprint: null })
    .onConflictDoUpdate({
      target: storeBrand.userId,
      set: { ...patch, publicationFingerprint: null },
    });
}
