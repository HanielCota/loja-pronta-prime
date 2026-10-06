'use server';

import { and, asc, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { learningResources } from '@/server/db/schema';
import { learningSlugFromTitle, swapWithNeighbor } from '../structure-rules';
import { requireAdmin } from './access';

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
      published: z.boolean(),
    })
    .safeParse({
      id: rawId || undefined,
      groupKey: field(form, 'groupKey'),
      groupTitle: field(form, 'groupTitle'),
      title: field(form, 'title'),
      description: field(form, 'description'),
      buttonLabel: field(form, 'buttonLabel'),
      destination: field(form, 'destination'),
      position: Number(field(form, 'position')),
      published: form.get('published') === 'true',
    });
  if (!parsed.success) return { message: 'Confira título, grupo, texto e ordem.', saved: false };
  if (!safeDestination(parsed.data.destination)) {
    return {
      message: 'Use uma rota desta plataforma ou um link http:// ou https://.',
      saved: false,
    };
  }
  const values = {
    groupKey: parsed.data.groupKey,
    groupTitle: parsed.data.groupTitle,
    title: parsed.data.title,
    description: parsed.data.description,
    buttonLabel: parsed.data.buttonLabel || null,
    destination: parsed.data.destination || null,
    position: parsed.data.position,
    status: parsed.data.published ? ('published' as const) : ('draft' as const),
  };
  try {
    let resourceId = parsed.data.id;
    if (resourceId) {
      const [updated] = await db
        .update(learningResources)
        .set(values)
        .where(and(eq(learningResources.id, resourceId), isNull(learningResources.archivedAt)))
        .returning({ id: learningResources.id });
      if (!updated) return { message: 'Este recurso não está disponível.', saved: false };
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
        .values({ ...values, slug })
        .returning({ id: learningResources.id });
      resourceId = created?.id;
    }
    if (!resourceId) return { message: 'Não consegui guardar este recurso.', saved: false };
    revalidatePath('/admin/recursos');
    revalidatePath('/sll/recursos');
    return { message: 'Recurso salvo.', saved: true, resourceId };
  } catch {
    return { message: 'Não consegui guardar. Atualize a página e tente de novo.', saved: false };
  }
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
