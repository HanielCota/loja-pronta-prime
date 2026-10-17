'use server';

import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireProductAction } from '@/features/products/server/access';
import { db } from '@/server/db';
import { assistantCategoryExperiments } from '@/server/db/schema';
import { readStoreObservations } from './metrics';

export async function createCategoryExperiment(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('sll');
  const parsed = z
    .object({
      left: z.coerce.number().int().positive().safe(),
      right: z.coerce.number().int().positive().safe(),
      minViews: z.coerce.number().int().min(1).max(1_000_000),
    })
    .safeParse({
      left: form.get('left'),
      right: form.get('right'),
      minViews: form.get('minViews'),
    });
  if (!parsed.success || parsed.data.left === parsed.data.right)
    redirect('/sll/comparar-categorias?resultado=invalid');
  const data = await readStoreObservations(userId);
  const left = data.items.find((item) => item.itemId === parsed.data.left);
  const right = data.items.find((item) => item.itemId === parsed.data.right);
  const baseline = data.runs.find((run) => run.status === 'completed');
  if (!baseline || !left?.categoryId || !right?.categoryId || left.categoryId === right.categoryId)
    redirect('/sll/comparar-categorias?resultado=unavailable');
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`assistant-experiment:${userId}`}))`,
    );
    const [existing] = await tx
      .select({ id: assistantCategoryExperiments.id })
      .from(assistantCategoryExperiments)
      .where(
        and(
          eq(assistantCategoryExperiments.userId, userId),
          eq(assistantCategoryExperiments.leftItemId, left.itemId),
          eq(assistantCategoryExperiments.rightItemId, right.itemId),
          eq(assistantCategoryExperiments.baselineRunId, baseline.id),
        ),
      );
    if (!existing)
      await tx.insert(assistantCategoryExperiments).values({
        userId,
        shopId: baseline.shopId,
        applicationId: baseline.applicationId,
        leftItemId: left.itemId,
        rightItemId: right.itemId,
        baselineRunId: baseline.id,
        minViews: parsed.data.minViews,
      });
  });
  revalidatePath('/sll/comparar-categorias');
  redirect('/sll/comparar-categorias?resultado=saved');
}
