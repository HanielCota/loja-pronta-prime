'use server';

import { and, asc, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { learningBanners } from '@/server/db/schema';
import { learningSlugFromTitle, swapWithNeighbor } from '../structure-rules';
import { requireAdmin } from './access';

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
  published: z.boolean(),
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
    published: formData.get('published') === 'true',
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
  if (parsed.data.published && (!existing?.imageStorageKey || !parsed.data.imageAlt)) {
    return {
      message: 'Adicione a imagem e a descrição dela antes de exibir o banner.',
      saved: false,
    };
  }

  const values = {
    label: parsed.data.label || null,
    title: parsed.data.title,
    description: parsed.data.description,
    buttonLabel: parsed.data.buttonLabel,
    destination: parsed.data.destination,
    imageAlt: parsed.data.imageAlt || null,
    position: parsed.data.position,
    status: parsed.data.published ? ('published' as const) : ('draft' as const),
  };
  try {
    let bannerId = existing?.id;
    if (existing) {
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
        .values({ ...values, slug })
        .returning({ id: learningBanners.id });
      bannerId = created?.id;
    }
    if (!bannerId) return { message: 'Não consegui guardar este banner.', saved: false };
    revalidatePath('/admin/banners');
    revalidatePath('/sll');
    revalidatePath('/');
    return { message: 'Banner salvo.', saved: true, bannerId };
  } catch {
    return { message: 'Não consegui guardar. Atualize a página e tente de novo.', saved: false };
  }
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
