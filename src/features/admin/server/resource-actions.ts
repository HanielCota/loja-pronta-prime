'use server';

import { and, asc, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import {
  learningLessons,
  learningNodeDrafts,
  learningNodeHistory,
  learningResourceLessons,
  learningResources,
} from '@/server/db/schema';
import { learningSlugFromTitle, swapWithNeighbor } from '../structure-rules';
import { requireAdmin } from './access';
import { getNodeDraft, saveNodeDraft } from './node-drafts';

import type { ResourceActionState } from '../structure-types';

function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === 'string' ? value : '';
}

function safeDestination(value: string) {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export async function saveSllResource(
  _previous: ResourceActionState,
  form: FormData,
): Promise<ResourceActionState> {
  await requireAdmin();
  const rawId = field(form, 'id');
  const lessonIds = form.getAll('relatedLessonId');
  if (
    lessonIds.some((value) => typeof value !== 'string' || !z.uuid().safeParse(value).success) ||
    new Set(lessonIds).size !== lessonIds.length
  )
    return { message: 'Confira as aulas relacionadas.', saved: false };
  const relatedLessonIds = lessonIds as string[];
  if (relatedLessonIds.length) {
    const lessons = await db.query.learningLessons.findMany({
      columns: { id: true },
      where: isNull(learningLessons.archivedAt),
    });
    const available = new Set(lessons.map((lesson) => lesson.id));
    if (relatedLessonIds.some((id) => !available.has(id)))
      return { message: 'Uma aula relacionada não está disponível.', saved: false };
  }
  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      groupKey: z
        .string()
        .trim()
        .min(1)
        .max(60)
        .regex(/^[a-z0-9-]+$/),
      groupTitle: z.string().trim().min(1).max(100),
      title: z.string().trim().min(1).max(160),
      description: z.string().trim().min(1).max(600),
      buttonLabel: z.string().trim().max(80),
      destination: z.string().trim().max(500),
      position: z.number().int().min(0).max(999),
    })
    .safeParse({
      id: rawId || undefined,
      groupKey: field(form, 'groupKey') || learningSlugFromTitle(field(form, 'groupTitle')),
      groupTitle: field(form, 'groupTitle'),
      title: field(form, 'title'),
      description: field(form, 'description'),
      buttonLabel: field(form, 'buttonLabel'),
      destination: field(form, 'destination'),
      position: Number(field(form, 'position')),
    });
  if (!parsed.success) return { message: 'Confira o nome, grupo e texto.', saved: false };
  if (!safeDestination(parsed.data.destination)) {
    return {
      message: 'Use uma rota desta plataforma ou um link http:// ou https://.',
      saved: false,
    };
  }
  const sameGroup = await db.query.learningResources.findFirst({
    columns: { groupKey: true },
    where: and(
      eq(learningResources.groupTitle, parsed.data.groupTitle),
      isNull(learningResources.archivedAt),
    ),
  });
  const values = {
    groupKey: rawId ? parsed.data.groupKey : (sameGroup?.groupKey ?? parsed.data.groupKey),
    groupTitle: parsed.data.groupTitle,
    title: parsed.data.title,
    description: parsed.data.description,
    buttonLabel: parsed.data.buttonLabel || null,
    destination: parsed.data.destination || null,
    position: parsed.data.position,
  };
  try {
    let resourceId = parsed.data.id;
    if (resourceId) {
      const resource = await db.query.learningResources.findFirst({
        columns: { id: true, status: true },
        where: and(eq(learningResources.id, resourceId), isNull(learningResources.archivedAt)),
      });
      if (!resource) return { message: 'Este recurso não está disponível.', saved: false };
      if (resource.status === 'published') {
        await saveNodeDraft('resource', resourceId, { ...values, relatedLessonIds });
        revalidatePath('/admin/recursos');
        return {
          message: 'Rascunho salvo. Publique quando estiver pronto.',
          saved: true,
          resourceId,
        };
      }
      const [updated] = await db
        .update(learningResources)
        .set(values)
        .where(and(eq(learningResources.id, resourceId), isNull(learningResources.archivedAt)))
        .returning({ id: learningResources.id });
      if (!updated) return { message: 'Este recurso não está disponível.', saved: false };
      await saveNodeDraft('resource', resourceId, { relatedLessonIds });
    } else {
      let slug = learningSlugFromTitle(parsed.data.title);
      for (
        let suffix = 2;
        await db.query.learningResources.findFirst({ where: eq(learningResources.slug, slug) });
        suffix++
      ) {
        slug = `${learningSlugFromTitle(parsed.data.title)}-${suffix}`;
      }
      const [created] = await db
        .insert(learningResources)
        .values({ ...values, slug, status: 'draft' })
        .returning({ id: learningResources.id });
      resourceId = created?.id;
    }
    if (!resourceId) return { message: 'Não consegui guardar este recurso.', saved: false };
    if (!parsed.data.id) await saveNodeDraft('resource', resourceId, { relatedLessonIds });
    revalidatePath('/admin/recursos');
    revalidatePath('/sll/recursos');
    return { message: 'Rascunho salvo. Publique quando estiver pronto.', saved: true, resourceId };
  } catch {
    return { message: 'Não consegui guardar. Atualize a página e tente de novo.', saved: false };
  }
}

/** Publicação explícita mantém os textos atuais visíveis até a troca completa. */
export async function publishSllResource(form: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().uuid().safeParse(form.get('id'));
  if (!id.success) return;
  const resource = await db.query.learningResources.findFirst({
    where: and(eq(learningResources.id, id.data), isNull(learningResources.archivedAt)),
  });
  if (!resource) return;
  const draft = await getNodeDraft('resource', id.data);
  const data = draft?.data;
  const currentLinks = await db.query.learningResourceLessons.findMany({
    columns: { lessonId: true },
    where: eq(learningResourceLessons.resourceId, id.data),
  });
  const destination = data?.destination === undefined ? resource.destination : data.destination;
  if (destination && !safeDestination(destination)) return;
  await db.transaction(async (tx) => {
    await tx
      .insert(learningNodeHistory)
      .values({
        kind: 'resource',
        nodeId: id.data,
        data: {
          groupTitle: resource.groupTitle,
          title: resource.title,
          description: resource.description,
          buttonLabel: resource.buttonLabel,
          destination: resource.destination,
          relatedLessonIds: currentLinks.map((link) => link.lessonId),
        },
      })
      .onConflictDoUpdate({
        target: [learningNodeHistory.kind, learningNodeHistory.nodeId],
        set: {
          data: {
            groupTitle: resource.groupTitle,
            title: resource.title,
            description: resource.description,
            buttonLabel: resource.buttonLabel,
            destination: resource.destination,
            relatedLessonIds: currentLinks.map((link) => link.lessonId),
          },
        },
      });
    await tx
      .update(learningResources)
      .set({
        ...(data?.groupTitle !== undefined ? { groupTitle: data.groupTitle } : {}),
        ...(data?.title !== undefined ? { title: data.title } : {}),
        ...(data?.description !== undefined
          ? { description: data.description ?? resource.description }
          : {}),
        ...(data?.buttonLabel !== undefined ? { buttonLabel: data.buttonLabel } : {}),
        ...(data?.destination !== undefined ? { destination: data.destination } : {}),
        status: 'published',
      })
      .where(eq(learningResources.id, id.data));
    if (data?.groupTitle !== undefined && data.groupTitle !== resource.groupTitle)
      await tx
        .update(learningResources)
        .set({ groupTitle: data.groupTitle })
        .where(
          and(
            eq(learningResources.groupKey, resource.groupKey),
            isNull(learningResources.archivedAt),
          ),
        );
    if (data?.relatedLessonIds) {
      await tx
        .delete(learningResourceLessons)
        .where(eq(learningResourceLessons.resourceId, id.data));
      for (const lessonId of data.relatedLessonIds)
        await tx.insert(learningResourceLessons).values({ resourceId: id.data, lessonId });
    }
    await tx
      .delete(learningNodeDrafts)
      .where(and(eq(learningNodeDrafts.kind, 'resource'), eq(learningNodeDrafts.nodeId, id.data)));
  });
  revalidatePath('/admin/recursos');
  revalidatePath('/sll/recursos');
}

export async function discardSllResourceDraft(form: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().uuid().safeParse(form.get('id'));
  if (!id.success) return;
  await db
    .delete(learningNodeDrafts)
    .where(and(eq(learningNodeDrafts.kind, 'resource'), eq(learningNodeDrafts.nodeId, id.data)));
  revalidatePath('/admin/recursos');
}

export async function restoreSllResourceVersion(form: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().uuid().safeParse(form.get('id'));
  if (!id.success || (await getNodeDraft('resource', id.data))) return;
  const previous = await db.query.learningNodeHistory.findFirst({
    where: and(eq(learningNodeHistory.kind, 'resource'), eq(learningNodeHistory.nodeId, id.data)),
  });
  if (!previous) return;
  await saveNodeDraft('resource', id.data, previous.data);
  await publishSllResource(form);
}

export async function archiveSllResource(form: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().uuid().safeParse(form.get('id'));
  if (!id.success) return;
  await db
    .update(learningResources)
    .set({ archivedAt: new Date(), status: 'draft' })
    .where(and(eq(learningResources.id, id.data), isNull(learningResources.archivedAt)));
  revalidatePath('/admin/recursos');
  revalidatePath('/sll/recursos');
}

export async function restoreSllResource(form: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().uuid().safeParse(form.get('id'));
  if (!id.success) return;
  await db
    .update(learningResources)
    .set({ archivedAt: null, status: 'draft' })
    .where(eq(learningResources.id, id.data));
  revalidatePath('/admin/arquivados');
  revalidatePath('/admin/recursos');
}

export async function moveSllResource(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.string().uuid(),
      direction: z.enum(['up', 'down']),
    })
    .safeParse({ id: form.get('id'), direction: form.get('direction') });
  if (!parsed.success) return;
  const resource = await db.query.learningResources.findFirst({
    columns: { id: true, groupKey: true },
    where: and(eq(learningResources.id, parsed.data.id), isNull(learningResources.archivedAt)),
  });
  if (!resource) return;
  const ordered = await db.query.learningResources.findMany({
    columns: { id: true, position: true },
    where: and(
      eq(learningResources.groupKey, resource.groupKey),
      isNull(learningResources.archivedAt),
    ),
    orderBy: [asc(learningResources.position), asc(learningResources.id)],
  });
  const reordered = swapWithNeighbor(
    ordered.map((item) => item.id),
    parsed.data.id,
    parsed.data.direction,
  );
  if (!reordered) return;
  await db.transaction(async (tx) => {
    for (const item of reordered) {
      await tx
        .update(learningResources)
        .set({ position: item.position })
        .where(eq(learningResources.id, item.id));
    }
  });
  revalidatePath('/admin/recursos');
  revalidatePath('/sll/recursos');
}

export async function reorderSllResources(
  form: FormData,
): Promise<{ saved: boolean; message: string }> {
  await requireAdmin();
  const groupKey = field(form, 'groupKey');
  const ids = form.getAll('id');
  if (
    !/^[a-z0-9-]{1,60}$/.test(groupKey) ||
    ids.some((id) => typeof id !== 'string' || !z.uuid().safeParse(id).success)
  ) {
    return { saved: false, message: 'Atualize a página e tente de novo.' };
  }
  const resources = await db.query.learningResources.findMany({
    columns: { id: true },
    where: and(eq(learningResources.groupKey, groupKey), isNull(learningResources.archivedAt)),
  });
  const expected = new Set(resources.map((resource) => resource.id));
  if (
    ids.length !== expected.size ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !expected.has(id as string))
  ) {
    return { saved: false, message: 'Os recursos mudaram. Atualize a página e tente de novo.' };
  }
  await db.transaction(async (tx) => {
    for (const [position, id] of ids.entries()) {
      await tx
        .update(learningResources)
        .set({ position })
        .where(eq(learningResources.id, id as string));
    }
  });
  revalidatePath('/admin/recursos');
  revalidatePath('/sll/recursos');
  return { saved: true, message: 'Nova ordem salva.' };
}
