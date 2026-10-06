'use server';

import { and, asc, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { learningBanners, learningNodeDrafts, learningNodeHistory } from '@/server/db/schema';
import { learningSlugFromTitle, swapWithNeighbor } from '../structure-rules';
import { requireAdmin } from './access';
import { getNodeDraft, saveNodeDraft } from './node-drafts';

import type { BannerActionState } from '../structure-types';

const schema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().max(80),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(600),
  buttonLabel: z.string().trim().min(1).max(80),
  destination: z.string().trim().min(1).max(500),
  imageAlt: z.string().trim().max(300),
  position: z.number().int().min(0).max(999),
});

function textField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function validDestination(value: string) {
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function saveSllBanner(
  _previous: BannerActionState,
  formData: FormData,
): Promise<BannerActionState> {
  await requireAdmin();
  const rawId = textField(formData, 'id');
  const positionText = textField(formData, 'position');
  const parsed = schema.safeParse({
    id: rawId || undefined,
    label: textField(formData, 'label'),
    title: textField(formData, 'title'),
    description: textField(formData, 'description'),
    buttonLabel: textField(formData, 'buttonLabel'),
    destination: textField(formData, 'destination'),
    imageAlt: textField(formData, 'imageAlt'),
    position: Number(positionText),
  });
  if (!parsed.success)
    return { message: 'Confira o título, texto, destino e posição.', saved: false };
  if (!validDestination(parsed.data.destination)) {
    return {
      message: 'Use um endereço desta plataforma ou um link que comece com https://.',
      saved: false,
    };
  }

  const existing = parsed.data.id
    ? await db.query.learningBanners.findFirst({
        columns: { id: true, slug: true, imageStorageKey: true, archivedAt: true },
        where: and(eq(learningBanners.id, parsed.data.id), isNull(learningBanners.archivedAt)),
      })
    : null;
  if (parsed.data.id && !existing)
    return { message: 'Este banner não está disponível.', saved: false };
  const values = {
    label: parsed.data.label || null,
    title: parsed.data.title,
    description: parsed.data.description,
    buttonLabel: parsed.data.buttonLabel,
    destination: parsed.data.destination,
    imageAlt: parsed.data.imageAlt || null,
    position: parsed.data.position,
  };
  try {
    let bannerId = existing?.id;
    if (existing) {
      const current = await db.query.learningBanners.findFirst({
        columns: { status: true },
        where: eq(learningBanners.id, existing.id),
      });
      if (current?.status === 'published') {
        await saveNodeDraft('banner', existing.id, values);
        revalidatePath('/admin/banners');
        return {
          message: 'Rascunho salvo. Publique quando estiver pronto.',
          saved: true,
          bannerId: existing.id,
        };
      }
      await db.update(learningBanners).set(values).where(eq(learningBanners.id, existing.id));
    } else {
      let slug = learningSlugFromTitle(parsed.data.title);
      for (
        let suffix = 2;
        await db.query.learningBanners.findFirst({ where: eq(learningBanners.slug, slug) });
        suffix++
      ) {
        slug = `${learningSlugFromTitle(parsed.data.title)}-${suffix}`;
      }
      const [created] = await db
        .insert(learningBanners)
        .values({ ...values, slug, status: 'draft' })
        .returning({ id: learningBanners.id });
      bannerId = created?.id;
    }
    if (!bannerId) return { message: 'Não consegui guardar este banner.', saved: false };
    revalidatePath('/admin/banners');
    revalidatePath('/sll');
    revalidatePath('/');
    return { message: 'Rascunho salvo. Publique quando estiver pronto.', saved: true, bannerId };
  } catch {
    return { message: 'Não consegui guardar. Atualize a página e tente de novo.', saved: false };
  }
}

export async function publishSllBanner(form: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().uuid().safeParse(form.get('id'));
  if (!id.success) return;
  const banner = await db.query.learningBanners.findFirst({
    where: and(eq(learningBanners.id, id.data), isNull(learningBanners.archivedAt)),
  });
  if (!banner) return;
  const draft = await getNodeDraft('banner', id.data);
  const data = draft?.data;
  const imageStorageKey = data?.imageStorageKey ?? banner.imageStorageKey;
  const imageAlt = data?.imageAlt ?? banner.imageAlt;
  const destination = data?.destination ?? banner.destination;
  if (!imageStorageKey || !imageAlt || !destination || !validDestination(destination)) return;
  await db.transaction(async (tx) => {
    const previous = {
      label: banner.label,
      title: banner.title,
      description: banner.description,
      buttonLabel: banner.buttonLabel,
      destination: banner.destination,
      imageAlt: banner.imageAlt,
      imageStorageKey: banner.imageStorageKey,
    };
    await tx
      .insert(learningNodeHistory)
      .values({ kind: 'banner', nodeId: id.data, data: previous })
      .onConflictDoUpdate({
        target: [learningNodeHistory.kind, learningNodeHistory.nodeId],
        set: { data: previous },
      });
    await tx
      .update(learningBanners)
      .set({
        ...(data?.label !== undefined ? { label: data.label } : {}),
        ...(data?.title !== undefined ? { title: data.title } : {}),
        ...(data?.description !== undefined
          ? { description: data.description ?? banner.description }
          : {}),
        ...(data?.buttonLabel !== undefined
          ? { buttonLabel: data.buttonLabel ?? banner.buttonLabel }
          : {}),
        ...(data?.destination !== undefined
          ? { destination: data.destination ?? banner.destination }
          : {}),
        ...(data?.imageAlt !== undefined ? { imageAlt: data.imageAlt } : {}),
        ...(data?.imageStorageKey !== undefined ? { imageStorageKey: data.imageStorageKey } : {}),
        status: 'published',
      })
      .where(eq(learningBanners.id, id.data));
    await tx
      .delete(learningNodeDrafts)
      .where(and(eq(learningNodeDrafts.kind, 'banner'), eq(learningNodeDrafts.nodeId, id.data)));
  });
  revalidatePath('/admin/banners');
  revalidatePath('/sll');
}

export async function discardSllBannerDraft(form: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().uuid().safeParse(form.get('id'));
  if (!id.success) return;
  await db
    .delete(learningNodeDrafts)
    .where(and(eq(learningNodeDrafts.kind, 'banner'), eq(learningNodeDrafts.nodeId, id.data)));
  revalidatePath('/admin/banners');
}

export async function restoreSllBannerVersion(form: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().uuid().safeParse(form.get('id'));
  if (!id.success || (await getNodeDraft('banner', id.data))) return;
  const previous = await db.query.learningNodeHistory.findFirst({
    where: and(eq(learningNodeHistory.kind, 'banner'), eq(learningNodeHistory.nodeId, id.data)),
  });
  if (!previous) return;
  await saveNodeDraft('banner', id.data, previous.data);
  await publishSllBanner(form);
}

export async function archiveSllBanner(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const [archived] = await db
    .update(learningBanners)
    .set({ archivedAt: new Date(), status: 'draft' })
    .where(and(eq(learningBanners.id, id.data), isNull(learningBanners.archivedAt)))
    .returning({ id: learningBanners.id });
  if (!archived) return;
  revalidatePath('/admin/banners');
  revalidatePath('/sll');
}

export async function restoreSllBanner(form: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().uuid().safeParse(form.get('id'));
  if (!id.success) return;
  await db
    .update(learningBanners)
    .set({ archivedAt: null, status: 'draft' })
    .where(eq(learningBanners.id, id.data));
  revalidatePath('/admin/arquivados');
  revalidatePath('/admin/banners');
}

export async function moveSllBanner(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id: z.string().uuid(), direction: z.enum(['up', 'down']) }).safeParse({
    id: formData.get('id'),
    direction: formData.get('direction'),
  });
  if (!parsed.success) return;
  const banners = await db.query.learningBanners.findMany({
    columns: { id: true, position: true },
    where: isNull(learningBanners.archivedAt),
    orderBy: [asc(learningBanners.position), asc(learningBanners.id)],
  });
  const reordered = swapWithNeighbor(
    banners.map((item) => item.id),
    parsed.data.id,
    parsed.data.direction,
  );
  if (!reordered) return;
  await db.transaction(async (tx) => {
    for (const item of reordered) {
      await tx
        .update(learningBanners)
        .set({ position: item.position })
        .where(eq(learningBanners.id, item.id));
    }
  });
  revalidatePath('/admin/banners');
  revalidatePath('/sll');
}

/** Salva a ordem completa para impedir que um arrasto misture banners de outra lista. */
export async function reorderSllBanners(
  formData: FormData,
): Promise<{ saved: boolean; message: string }> {
  await requireAdmin();
  const ids = formData.getAll('id');
  if (ids.some((id) => typeof id !== 'string' || !z.uuid().safeParse(id).success)) {
    return { saved: false, message: 'Atualize a página e tente de novo.' };
  }
  const banners = await db.query.learningBanners.findMany({
    columns: { id: true },
    where: isNull(learningBanners.archivedAt),
    orderBy: [asc(learningBanners.position), asc(learningBanners.id)],
  });
  const expected = banners.map((banner) => banner.id);
  if (
    ids.length !== expected.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !expected.includes(id as string))
  ) {
    return { saved: false, message: 'Os banners mudaram. Atualize a página e tente de novo.' };
  }
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx
        .update(learningBanners)
        .set({ position: index })
        .where(eq(learningBanners.id, id as string));
    }
  });
  revalidatePath('/admin/banners');
  revalidatePath('/sll');
  return { saved: true, message: 'Nova ordem salva.' };
}
