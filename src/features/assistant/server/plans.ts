import { and, desc, eq, sql } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/server/db';
import {
  assistantPlans,
  assistantPlanProgress,
  assistantPlaybooks,
  shopeeConnections,
  sllPlanIntake,
} from '@/server/db/schema';
import { planContextSchema, playbookSchema, type Strategy } from '../model';

export async function getAssistantPlan(userId: string) {
  const [plan] = await db
    .select()
    .from(assistantPlans)
    .where(and(eq(assistantPlans.userId, userId), eq(assistantPlans.active, true)));
  const progress = plan
    ? await db.select().from(assistantPlanProgress).where(eq(assistantPlanProgress.planId, plan.id))
    : [];
  const [intake] = await db.select().from(sllPlanIntake).where(eq(sllPlanIntake.userId, userId));
  return { plan, completedIds: progress.map((row) => row.actionId), intake };
}

export async function createAssistantPlan(userId: string, input: unknown) {
  const context = planContextSchema.parse(input);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`assistant-plan:${userId}`}))`);
    const [existing] = await tx
      .select()
      .from(assistantPlans)
      .where(and(eq(assistantPlans.userId, userId), eq(assistantPlans.active, true)));
    if (existing) return existing;
    const [playbook] = await tx
      .select()
      .from(assistantPlaybooks)
      .where(
        and(
          eq(assistantPlaybooks.strategy, context.strategy),
          sql`${assistantPlaybooks.publishedAt} is not null`,
          sql`${assistantPlaybooks.archivedAt} is null`,
        ),
      )
      .orderBy(desc(assistantPlaybooks.revision))
      .limit(1);
    if (!playbook) return null;
    const validated = playbookSchema.parse(playbook);
    const [connection] = await tx
      .select()
      .from(shopeeConnections)
      .where(
        and(eq(shopeeConnections.userId, userId), sql`${shopeeConnections.revokedAt} is null`),
      );
    const [created] = await tx
      .insert(assistantPlans)
      .values({
        userId,
        playbookId: playbook.id,
        revision: playbook.revision,
        strategy: context.strategy,
        storeAge: context.storeAge,
        actions: validated.actions,
        shopId: connection?.shopId ?? null,
        applicationId: connection?.applicationId ?? null,
      })
      .returning();
    await tx
      .insert(sllPlanIntake)
      .values({ userId, storeAge: context.storeAge })
      .onConflictDoUpdate({
        target: sllPlanIntake.userId,
        set: { storeAge: context.storeAge, updatedAt: new Date() },
      });
    return created ?? null;
  });
}

export async function setAssistantTask(
  userId: string,
  planId: string,
  actionId: string,
  completed: boolean,
) {
  return db.transaction(async (tx) => {
    const [plan] = await tx
      .select()
      .from(assistantPlans)
      .where(
        and(
          eq(assistantPlans.id, planId),
          eq(assistantPlans.userId, userId),
          eq(assistantPlans.active, true),
        ),
      )
      .for('update');
    if (!plan || !plan.actions.some((action) => action.id === actionId)) return false;
    if (completed)
      await tx.insert(assistantPlanProgress).values({ planId, actionId }).onConflictDoNothing();
    else
      await tx
        .delete(assistantPlanProgress)
        .where(
          and(
            eq(assistantPlanProgress.planId, planId),
            eq(assistantPlanProgress.actionId, actionId),
          ),
        );
    return true;
  });
}

// A lista de materiais pode conferir várias aulas. A leitura é compartilhada só nesta
// renderização, mantendo separadas as contas e as mudanças do plano na próxima requisição.
const readAssistantLessonReferences = cache(async (userId: string) => {
  const [plan] = await db
    .select({ actions: assistantPlans.actions })
    .from(assistantPlans)
    .where(and(eq(assistantPlans.userId, userId), eq(assistantPlans.active, true)));
  return new Set(
    plan?.actions.flatMap((action) => (action.lessonId ? [action.lessonId] : [])) ?? [],
  );
});

export async function hasAssistantLessonReference(userId: string, lessonId: string) {
  return (await readAssistantLessonReferences(userId)).has(lessonId);
}

export async function publishAssistantPlaybook(input: unknown, actorId: string, publish: boolean) {
  const parsed = playbookSchema.parse(input);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`assistant-playbook:${parsed.strategy}`}))`,
    );
    const [previous] = await tx
      .select({ revision: assistantPlaybooks.revision })
      .from(assistantPlaybooks)
      .where(eq(assistantPlaybooks.strategy, parsed.strategy as Strategy))
      .orderBy(desc(assistantPlaybooks.revision))
      .limit(1);
    return tx
      .insert(assistantPlaybooks)
      .values({
        ...parsed,
        revision: (previous?.revision ?? 0) + 1,
        updatedBy: actorId,
        publishedAt: publish ? new Date() : null,
      })
      .returning();
  });
}
