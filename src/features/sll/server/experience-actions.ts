'use server';

import { asc, eq, and, isNotNull, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { refresh, revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import {
  hotmartProductMappings,
  hotmartPurchases,
  learningContentBlocks,
  learningVideoVariants,
  studentExperiences,
  user,
} from '@/server/db/schema';
import { isExpertId } from '@/config/experts';
import { requireProductAction } from '@/features/products/server/access';
import { requireAdmin } from '@/features/admin/server/access';
import { revalidateSllContent } from './content-cache';
import { getStudentExperience } from './experience';
import { reconcileProductAccess } from '@/features/hotmart/server/product-access';
import { revalidateAdminOverview } from '@/features/admin/server/overview-cache';
import { pandaVideoId } from '../panda-video';
import { isProgressId } from '../progress-rules';

export async function chooseExpert(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('sll');
  const expert = form.get('expert');
  const experience = await getStudentExperience(userId);
  if (!isExpertId(expert) || !experience.allowed.includes(expert))
    redirect('/sll/plano?resultado=expert-invalid');
  await db
    .insert(studentExperiences)
    .values({ userId, expert })
    .onConflictDoUpdate({
      target: studentExperiences.userId,
      set: { expert, updatedAt: new Date() },
    });
  // Só a tela de quem escolheu: o conteúdo compartilhado não depende do apresentador dela.
  refresh();
  redirect('/sll/plano?resultado=expert-saved');
}

export async function saveExpertOffer(form: FormData): Promise<void> {
  await requireAdmin('/admin/experts');
  const code = String(form.get('code') ?? '').trim();
  const access = form.get('access');
  const expert = form.get('expert');
  if (
    !code ||
    code.length > 150 ||
    [...code].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    !isExpertId(expert) ||
    (access !== 'sll' && access !== 'loja-pronta')
  )
    redirect('/admin/experts?resultado=invalid');
  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('hotmart-product-mappings'))`);
    // Uma compra existente nunca muda de apresentador por uma alteração posterior do mapeamento.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`expert-offer:${code}`}))`);
    const previous = await tx
      .select()
      .from(hotmartProductMappings)
      .where(eq(hotmartProductMappings.productUcode, code));
    if (previous.some((row) => row.expert !== expert)) return false;
    await tx
      .insert(hotmartProductMappings)
      .values({ productUcode: code, access, expert, primary: false })
      .onConflictDoUpdate({
        target: [hotmartProductMappings.productUcode, hotmartProductMappings.access],
        set: { expert },
      });
    // Reconcile existing buyers atomically with the new mapping; event replay stays idempotent.
    const buyers = await tx
      .selectDistinct({ userId: hotmartPurchases.userId })
      .from(hotmartPurchases)
      .where(
        and(
          eq(hotmartPurchases.productUcode, code),
          eq(hotmartPurchases.active, true),
          isNotNull(hotmartPurchases.userId),
        ),
      )
      .orderBy(asc(hotmartPurchases.userId));
    for (const { userId } of buyers) {
      if (!userId) continue;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
      await reconcileProductAccess(tx, userId, access);
    }
    return true;
  });
  revalidateAdminOverview();
  revalidatePath('/', 'layout');
  revalidatePath('/admin/experts');
  redirect(`/admin/experts?resultado=${outcome ? 'saved' : 'offer-used'}`);
}

export async function assignManualExpert(form: FormData): Promise<void> {
  const session = await requireAdmin('/admin/experts');
  const userId = String(form.get('userId') ?? '');
  const expert = form.get('expert');
  if (!userId || userId.length > 200 || !isExpertId(expert))
    redirect('/admin/experts?resultado=invalid');
  const [account] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
  if (!account) redirect('/admin/experts?resultado=invalid');
  await db
    .insert(studentExperiences)
    .values({
      userId,
      expert,
      manualExpert: expert,
      manualAssignedBy: session.user.id,
      manualAssignedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: studentExperiences.userId,
      set: {
        expert,
        manualExpert: expert,
        manualAssignedBy: session.user.id,
        manualAssignedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  revalidatePath('/sll', 'layout');
  redirect('/admin/experts?resultado=saved');
}

export async function saveVideoVariant(form: FormData): Promise<void> {
  const session = await requireAdmin('/admin/experts');
  const blockId = String(form.get('blockId') ?? '');
  const expert = form.get('expert');
  const mode = form.get('mode');
  const videoId = pandaVideoId(String(form.get('videoId') ?? ''));
  if (
    !isProgressId(blockId) ||
    !isExpertId(expert) ||
    !['draft', 'publish', 'withdraw'].includes(String(mode)) ||
    (mode !== 'withdraw' && !videoId)
  )
    redirect('/admin/experts?resultado=invalid');
  const [block] = await db
    .select({ kind: learningContentBlocks.kind })
    .from(learningContentBlocks)
    .where(eq(learningContentBlocks.id, blockId));
  if (block?.kind !== 'video') redirect('/admin/experts?resultado=invalid');
  const changes = {
    ...(mode === 'publish'
      ? { publishedVideoId: videoId, draftVideoId: videoId }
      : mode === 'withdraw'
        ? { publishedVideoId: null }
        : { draftVideoId: videoId }),
    updatedBy: session.user.id,
    updatedAt: new Date(),
  };
  await db
    .insert(learningVideoVariants)
    .values({ blockId, expert, ...changes })
    .onConflictDoUpdate({
      target: [learningVideoVariants.blockId, learningVideoVariants.expert],
      set: changes,
    });
  if (mode !== 'draft') revalidateSllContent();
  revalidatePath('/admin/experts');
  redirect('/admin/experts?resultado=saved');
}
