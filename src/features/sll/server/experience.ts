import { cache } from 'react';
import { and, asc, eq, gt, inArray, isNull, lte } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  hotmartProductMappings,
  hotmartPurchases,
  hotmartPurchaseAccessRevocations,
  studentExperiences,
  learningVideoVariants,
  manualProductGrants,
  historicalSllPurchases,
} from '@/server/db/schema';
import { isExpertId, type ExpertId } from '@/config/experts';
import { expertContentData } from '../experience';
import type { ContentPreviewKind } from '@/features/admin/content-preview';

export const getStudentExperience = cache(async (userId: string) => {
  const [settings, purchases, manual, historical] = await Promise.all([
    db.select().from(studentExperiences).where(eq(studentExperiences.userId, userId)).limit(1),
    db
      .select({ expert: hotmartPurchases.expert })
      .from(hotmartPurchases)
      .innerJoin(
        hotmartProductMappings,
        eq(hotmartPurchases.productUcode, hotmartProductMappings.productUcode),
      )
      .leftJoin(
        hotmartPurchaseAccessRevocations,
        and(
          eq(hotmartPurchaseAccessRevocations.transaction, hotmartPurchases.transaction),
          eq(hotmartPurchaseAccessRevocations.product, 'sll'),
        ),
      )
      .where(
        and(
          isNull(hotmartPurchaseAccessRevocations.transaction),
          eq(hotmartPurchases.userId, userId),
          eq(hotmartPurchases.active, true),
          gt(hotmartPurchases.expiresAt, new Date()),
          lte(hotmartPurchases.purchasedAt, new Date()),
          eq(hotmartProductMappings.access, 'sll'),
        ),
      )
      .orderBy(asc(hotmartPurchases.lastEventAt)),
    db
      .select({ product: manualProductGrants.product })
      .from(manualProductGrants)
      .where(and(eq(manualProductGrants.userId, userId), eq(manualProductGrants.product, 'sll'))),
    db
      .select({ transaction: historicalSllPurchases.transaction })
      .from(historicalSllPurchases)
      .where(
        and(
          eq(historicalSllPurchases.userId, userId),
          eq(historicalSllPurchases.active, true),
          isNull(historicalSllPurchases.revokedAt),
          lte(historicalSllPurchases.purchasedAt, new Date()),
          gt(historicalSllPurchases.expiresAt, new Date()),
        ),
      )
      .limit(1),
  ]);
  const allowed: ExpertId[] = [...new Set(purchases.map((row) => row.expert).filter(isExpertId))];
  if ((manual.length || historical.length) && !allowed.includes('pri')) allowed.push('pri');
  const profile = settings[0];
  if (profile?.manualExpert && !allowed.includes(profile.manualExpert))
    allowed.push(profile.manualExpert);
  if (!allowed.length) allowed.push('pri');
  const expert = profile && allowed.includes(profile.expert) ? profile.expert : allowed[0]!;
  return { expert, allowed };
});

export async function studentContentBlocks<
  T extends { id: string; kind: ContentPreviewKind; data: unknown },
>(userId: string, blocks: T[]) {
  const { expert } = await getStudentExperience(userId);
  const videos = blocks.filter((block) => block.kind === 'video');
  const variants = videos.length
    ? await db
        .select()
        .from(learningVideoVariants)
        .where(
          and(
            inArray(
              learningVideoVariants.blockId,
              videos.map((block) => block.id),
            ),
            eq(learningVideoVariants.expert, expert),
          ),
        )
    : [];
  const byId = new Map(variants.map((row) => [row.blockId, row.publishedVideoId]));
  return blocks.map((block) => ({
    id: block.id,
    kind: block.kind,
    data: expertContentData(block.kind, block.data, expert, byId.get(block.id)),
  }));
}
