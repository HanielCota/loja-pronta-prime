import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { storeBannerKits, storeBrand } from '@/server/db/schema';
import { brandFingerprint } from '../../server/fingerprint';
import { bannerDraftSchema, type BannerDraft } from '../model';

export async function readBannerKit(userId: string) {
  const [kit] = await db.select().from(storeBannerKits).where(eq(storeBannerKits.userId, userId));
  return kit ?? null;
}

/** Lock the brand first, so edits cannot approve a different snapshot concurrently. */
export async function saveBannerKit(userId: string, revision: string | null, draft: BannerDraft) {
  const parsed = bannerDraftSchema.parse(draft);
  return db.transaction(async (tx) => {
    const [brand] = await tx
      .select()
      .from(storeBrand)
      .where(eq(storeBrand.userId, userId))
      .for('update');
    if (!brand?.completedAt || !brand.name || !brand.logoImage || !brand.description) return false;
    const [existing] = await tx
      .select()
      .from(storeBannerKits)
      .where(eq(storeBannerKits.userId, userId));
    if ((existing?.revision ?? null) !== revision) return false;
    const values = {
      ...parsed,
      revision: randomUUID(),
      brandFingerprint: brandFingerprint(brand),
      approvedAt: null,
      updatedAt: new Date(),
    };
    await tx
      .insert(storeBannerKits)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: storeBannerKits.userId, set: values });
    return true;
  });
}

export async function approveBannerKit(userId: string, revision: string) {
  return db.transaction(async (tx) => {
    const [brand] = await tx
      .select()
      .from(storeBrand)
      .where(eq(storeBrand.userId, userId))
      .for('update');
    if (!brand?.completedAt || !brand.logoImage) return false;
    const [approved] = await tx
      .update(storeBannerKits)
      .set({ approvedAt: new Date() })
      .where(
        and(
          eq(storeBannerKits.userId, userId),
          eq(storeBannerKits.revision, revision),
          eq(storeBannerKits.brandFingerprint, brandFingerprint(brand)),
        ),
      )
      .returning({ revision: storeBannerKits.revision });
    return Boolean(approved);
  });
}
