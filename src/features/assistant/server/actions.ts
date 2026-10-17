'use server';

import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireProductAction } from '@/features/products/server/access';
import { requireAdmin } from '@/features/admin/server/access';
import { db } from '@/server/db';
import {
  assistantPlans,
  assistantJobs,
  assistantPlaybooks,
  sllPlanIntake,
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';
import { createAssistantPlan, publishAssistantPlaybook, setAssistantTask } from './plans';
import {
  planContextSchema,
  planNeedsHistory,
  STRATEGIES,
  starterPlaybooks,
  playbookSchema,
} from '../model';
import { readShopeeAccess } from '@/features/shopee/server/connection';
import { assertAssistantAccess } from './metrics';

export async function startAssistantPlan(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('sll');
  const parsed = planContextSchema.safeParse({
    storeAge: form.get('storeAge'),
    strategy: form.get('strategy'),
  });
  if (!parsed.success) redirect('/sll/plano?resultado=invalid');
  if (planNeedsHistory(parsed.data.storeAge)) {
    await db
      .insert(sllPlanIntake)
      .values({ userId, storeAge: parsed.data.storeAge })
      .onConflictDoUpdate({
        target: sllPlanIntake.userId,
        set: { storeAge: parsed.data.storeAge, updatedAt: new Date() },
      });
    redirect('/sll/plano?resultado=history');
  }
  const plan = await createAssistantPlan(userId, parsed.data);
  revalidatePath('/sll/plano');
  redirect(`/sll/plano?resultado=${plan ? 'started' : 'preparing'}`);
}

export async function markAssistantTask(form: FormData): Promise<void> {
  const { userId } = await requireProductAction('sll');
  const id = z.uuid().safeParse(form.get('planId'));
  const actionId = String(form.get('actionId') ?? '');
  if (!id.success || actionId.length > 80) redirect('/sll/plano?resultado=invalid');
  const saved = await setAssistantTask(userId, id.data, actionId, form.get('completed') === 'true');
  revalidatePath('/sll/plano');
  redirect(`/sll/plano?resultado=${saved ? 'task-saved' : 'invalid'}`);
}

export async function restartAssistantPlan(): Promise<void> {
  const { userId } = await requireProductAction('sll');
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`assistant-plan:${userId}`}))`);
    await tx
      .update(assistantPlans)
      .set({ active: false })
      .where(and(eq(assistantPlans.userId, userId), eq(assistantPlans.active, true)));
    await tx.delete(sllPlanIntake).where(eq(sllPlanIntake.userId, userId));
  });
  revalidatePath('/sll/plano');
  redirect('/sll/plano');
}

export async function queueStoreCollection(): Promise<void> {
  const { userId } = await requireProductAction('sll');
  try {
    const config = await assertAssistantAccess(userId, 'sll');
    await readShopeeAccess(userId, config);
  } catch {
    redirect('/sll/plano?resultado=connection-required');
  }
  await db
    .insert(assistantJobs)
    .values({
      userId,
      kind: 'collect',
      deduplicationKey: `collect:${userId}:${Math.floor(Date.now() / (15 * 60 * 1000))}`,
    })
    .onConflictDoNothing();
  revalidatePath('/sll/plano');
  redirect('/sll/plano?resultado=queued');
}

export async function saveAssistantPlaybook(form: FormData): Promise<void> {
  const session = await requireAdmin('/admin/assistente');
  const strategy = form.get('strategy');
  if (!STRATEGIES.includes(strategy as (typeof STRATEGIES)[number]))
    redirect('/admin/assistente?resultado=invalid');
  const actions = Array.from({ length: 7 }, (_, index) => ({
    id: `dia-${index + 1}`,
    day: index + 1,
    title: form.get(`title-${index + 1}`),
    description: form.get(`description-${index + 1}`),
    lessonId: form.get(`lesson-${index + 1}`) || null,
  }));
  // Uma tarefa não promete uma aula que ainda é rascunho ou foi arquivada.
  const lessons = actions.flatMap((action) => (action.lessonId ? [String(action.lessonId)] : []));
  for (const lessonId of lessons) {
    if (!z.uuid().safeParse(lessonId).success) redirect('/admin/assistente?resultado=invalid');
    const [lesson] = await db
      .select({ id: learningLessons.id })
      .from(learningLessons)
      .innerJoin(learningModules, eq(learningLessons.moduleId, learningModules.id))
      .innerJoin(learningStages, eq(learningModules.stageId, learningStages.id))
      .innerJoin(learningTracks, eq(learningStages.trackId, learningTracks.id))
      .where(
        and(
          eq(learningLessons.id, lessonId),
          eq(learningLessons.status, 'published'),
          eq(learningModules.status, 'published'),
          eq(learningStages.status, 'published'),
          eq(learningTracks.status, 'published'),
          sql`${learningModules.archivedAt} is null and ${learningStages.archivedAt} is null and ${learningTracks.archivedAt} is null`,
          sql`${learningLessons.archivedAt} is null`,
        ),
      );
    if (!lesson) redirect('/admin/assistente?resultado=lesson-unavailable');
  }
  const parsed = playbookSchema.safeParse({ strategy, title: form.get('title'), actions });
  if (!parsed.success) redirect('/admin/assistente?resultado=invalid');
  await publishAssistantPlaybook(parsed.data, session.user.id, form.get('mode') === 'publish');
  revalidatePath('/admin/assistente');
  revalidatePath('/sll/plano');
  redirect('/admin/assistente?resultado=saved');
}

export async function prepareStarterPlaybooks(): Promise<void> {
  const session = await requireAdmin('/admin/assistente');
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('assistant-starter-playbooks'))`);
    for (const book of starterPlaybooks()) {
      const [existing] = await tx
        .select({ id: assistantPlaybooks.id })
        .from(assistantPlaybooks)
        .where(eq(assistantPlaybooks.strategy, book.strategy))
        .limit(1);
      if (!existing)
        await tx.insert(assistantPlaybooks).values({ ...book, updatedBy: session.user.id });
    }
  });
  revalidatePath('/admin/assistente');
  redirect('/admin/assistente?resultado=saved');
}
