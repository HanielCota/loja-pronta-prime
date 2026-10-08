'use server';

import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { revalidateSllContent } from '@/features/sll/server/content-cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import {
  learningBanners,
  learningNodeDrafts,
  learningNodeHistory,
  type LearningNodeDraftData,
} from '@/server/db/schema';
import { parseEditorIntent } from '../editor-intent';
import { learningSlugFromTitle, swapWithNeighbor } from '../structure-rules';
import { requireAdmin } from './access';
import { getNodeDraftForUpdate, saveNodeDraft, withNodeDraftLock } from './node-drafts';
import { isSafeContentDestination } from '@/lib/urls';

import type {
  BannerActionState,
  EditorActionState,
  StructureActionState,
} from '../structure-types';

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
  return isSafeContentDestination(value);
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
  // A posição muda só pela lista (arrastar, subir, descer), que grava direto no banner. Ela
  // entra apenas na criação; no rascunho, seria um valor velho que a publicação ignoraria.
  const values = {
    label: parsed.data.label || null,
    title: parsed.data.title,
    description: parsed.data.description,
    buttonLabel: parsed.data.buttonLabel,
    destination: parsed.data.destination,
    imageAlt: parsed.data.imageAlt || null,
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
        .values({ ...values, position: parsed.data.position, slug, status: 'draft' })
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

/** Campos do rascunho que substituem os do banner; o que o rascunho não mexeu fica igual. */
function bannerDraftValues(
  banner: { description: string; buttonLabel: string; destination: string },
  data: LearningNodeDraftData | undefined,
) {
  return {
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
  };
}

const unavailable = {
  saved: false,
  message: 'Este banner não está disponível. Atualize a página.',
};

/**
 * Publica o rascunho (ou, em `replacement`, a versão anterior) numa transação com o rascunho
 * travado e relido lá dentro: um salvamento que chegue no meio espera em vez de se perder.
 * Se a conferência falhar, nada é gravado, nem um rascunho com a versão anterior.
 */
async function publishBanner(
  id: string,
  replacement?: LearningNodeDraftData,
): Promise<StructureActionState> {
  return withNodeDraftLock('banner', id, async (tx) => {
    const banner = await tx.query.learningBanners.findFirst({
      where: and(eq(learningBanners.id, id), isNull(learningBanners.archivedAt)),
    });
    if (!banner) return unavailable;
    const draft = await getNodeDraftForUpdate(tx, 'banner', id);
    if (replacement && draft)
      return {
        saved: false,
        message: 'Descarte ou publique o rascunho antes de voltar à versão anterior.',
      };
    const data = replacement ?? draft?.data;
    // Confere exatamente o que vai ser gravado: no rascunho, `null` quer dizer "apagado" e não
    // pode cair no valor publicado, ou o banner sairia sem imagem ou sem descrição.
    const imageStorageKey =
      data?.imageStorageKey !== undefined ? data.imageStorageKey : banner.imageStorageKey;
    const imageAlt = data?.imageAlt !== undefined ? data.imageAlt : banner.imageAlt;
    const destination = data?.destination ?? banner.destination;
    if (!imageStorageKey)
      return { saved: false, message: 'Envie a imagem do banner antes de publicar.' };
    if (!imageAlt)
      return {
        saved: false,
        message: 'Escreva a descrição da imagem e salve antes de publicar.',
      };
    if (!destination || !validDestination(destination))
      return { saved: false, message: 'Confira o destino do banner e salve antes de publicar.' };
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
      .values({ kind: 'banner', nodeId: id, data: previous })
      .onConflictDoUpdate({
        target: [learningNodeHistory.kind, learningNodeHistory.nodeId],
        set: { data: previous },
      });
    await tx
      .update(learningBanners)
      .set({ ...bannerDraftValues(banner, data), status: 'published' })
      .where(eq(learningBanners.id, id));
    if (draft)
      await tx
        .delete(learningNodeDrafts)
        .where(and(eq(learningNodeDrafts.kind, 'banner'), eq(learningNodeDrafts.nodeId, id)));
    return { saved: true, message: '' };
  });
}

function formBannerId(form: FormData) {
  const id = z.string().uuid().safeParse(form.get('id'));
  return id.success ? id.data : null;
}

export async function publishSllBanner(form: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const id = formBannerId(form);
  if (!id) return unavailable;
  const result = await publishBanner(id);
  if (!result.saved) return result;
  revalidateSllContent();
  revalidatePath('/admin/banners');
  revalidatePath('/sll');
  return { saved: true, message: 'Banner publicado. As alunas já veem esta versão.' };
}

export async function discardSllBannerDraft(form: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const id = formBannerId(form);
  if (!id) return unavailable;
  const removed = await db
    .delete(learningNodeDrafts)
    .where(and(eq(learningNodeDrafts.kind, 'banner'), eq(learningNodeDrafts.nodeId, id)))
    .returning({ nodeId: learningNodeDrafts.nodeId });
  if (!removed.length) return { saved: false, message: 'Não há rascunho para descartar.' };
  revalidatePath('/admin/banners');
  return { saved: true, message: 'Rascunho descartado. A versão publicada continua igual.' };
}

export async function restoreSllBannerVersion(form: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const id = formBannerId(form);
  if (!id) return unavailable;
  const previous = await db.query.learningNodeHistory.findFirst({
    where: and(eq(learningNodeHistory.kind, 'banner'), eq(learningNodeHistory.nodeId, id)),
  });
  if (!previous) return { saved: false, message: 'Não há versão anterior deste banner.' };
  const result = await publishBanner(id, previous.data);
  if (!result.saved) return result;
  revalidateSllContent();
  revalidatePath('/admin/banners');
  revalidatePath('/sll');
  return { saved: true, message: 'A versão anterior do banner voltou para as alunas.' };
}

export async function archiveSllBanner(form: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const id = formBannerId(form);
  if (!id) return unavailable;
  const archived = await withNodeDraftLock('banner', id, async (tx) => {
    const banner = await tx.query.learningBanners.findFirst({
      where: and(eq(learningBanners.id, id), isNull(learningBanners.archivedAt)),
    });
    if (!banner) return false;
    // O banner volta como rascunho: as edições pendentes passam para ele, senão um rascunho
    // antigo continuaria na tela e voltaria a valer na próxima publicação.
    const draft = await getNodeDraftForUpdate(tx, 'banner', id);
    await tx
      .update(learningBanners)
      .set({ ...bannerDraftValues(banner, draft?.data), archivedAt: new Date(), status: 'draft' })
      .where(eq(learningBanners.id, id));
    await tx
      .delete(learningNodeDrafts)
      .where(and(eq(learningNodeDrafts.kind, 'banner'), eq(learningNodeDrafts.nodeId, id)));
    return true;
  });
  if (!archived) return unavailable;
  revalidateSllContent();
  revalidatePath('/admin/banners');
  revalidatePath('/admin/arquivados');
  revalidatePath('/sll');
  return { saved: true, message: 'Banner arquivado. Ele fica em Itens arquivados.' };
}

/** Só um banner arquivado volta: em um ativo, isto o tiraria das alunas sem aviso. */
export async function restoreSllBanner(form: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const id = formBannerId(form);
  if (!id) return unavailable;
  const restored = await db
    .update(learningBanners)
    .set({ archivedAt: null, status: 'draft' })
    .where(and(eq(learningBanners.id, id), isNotNull(learningBanners.archivedAt)))
    .returning({ id: learningBanners.id });
  if (!restored.length) return { saved: false, message: 'Este banner não está arquivado.' };
  revalidateSllContent();
  revalidatePath('/admin/arquivados');
  revalidatePath('/admin/banners');
  return { saved: true, message: 'Banner restaurado como rascunho.' };
}

export async function moveSllBanner(
  formData: FormData,
  direction: 'up' | 'down',
): Promise<StructureActionState> {
  await requireAdmin();
  const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: formData.get('id') });
  if (!parsed.success) return unavailable;
  const banners = await db.query.learningBanners.findMany({
    columns: { id: true, position: true },
    where: isNull(learningBanners.archivedAt),
    orderBy: [asc(learningBanners.position), asc(learningBanners.id)],
  });
  const reordered = swapWithNeighbor(
    banners.map((item) => item.id),
    parsed.data.id,
    direction,
  );
  if (!reordered)
    return {
      saved: false,
      message: direction === 'up' ? 'Este banner já é o primeiro.' : 'Este banner já é o último.',
    };
  await db.transaction(async (tx) => {
    for (const item of reordered) {
      await tx
        .update(learningBanners)
        .set({ position: item.position })
        .where(eq(learningBanners.id, item.id));
    }
  });
  revalidateSllContent();
  revalidatePath('/admin/banners');
  revalidatePath('/sll');
  return {
    saved: true,
    message: direction === 'up' ? 'Banner movido para cima.' : 'Banner movido para baixo.',
  };
}

/**
 * Os botões abaixo do editor mandam a ação em `intent`. Um só formulário com estado deixa a
 * resposta (deu certo ou o que falta) aparecer na tela e no leitor de tela, também sem
 * JavaScript.
 */
export async function runSllBannerAction(
  _previous: EditorActionState,
  form: FormData,
): Promise<EditorActionState> {
  const intent = parseEditorIntent(form.get('intent'));
  if (!intent) return { saved: false, message: 'Atualize a página e tente de novo.' };
  try {
    const result =
      intent === 'publish'
        ? await publishSllBanner(form)
        : intent === 'discard'
          ? await discardSllBannerDraft(form)
          : intent === 'restore'
            ? await restoreSllBannerVersion(form)
            : intent === 'archive'
              ? await archiveSllBanner(form)
              : await moveSllBanner(form, intent);
    return { ...result, intent };
  } catch (error) {
    // Sessão vencida: o requireAdmin redireciona para a entrada, e isso não é uma falha.
    unstable_rethrow(error);
    return { saved: false, message: 'Não consegui concluir. Atualize a página e tente de novo.' };
  }
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
  revalidateSllContent();
  revalidatePath('/admin/banners');
  revalidatePath('/sll');
  return { saved: true, message: 'Nova ordem salva.' };
}
