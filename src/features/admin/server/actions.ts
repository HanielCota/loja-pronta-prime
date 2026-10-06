'use server';

import { and, eq, inArray, sql } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { storage } from '@/server/storage';
import { requireAdmin } from './access';
import { parseLessonEdit } from '../lesson-edit';
import { getEditableLessonBlocks, saveNodeDraft } from './node-drafts';
import { db } from '@/server/db';
import {
  learningContentBlocks,
  learningLessons,
  hotmartProductMappings,
  hotmartPurchases,
  productAccessEvents,
  manualProductGrants,
  studentProducts,
  user,
  type LearningContentBlockData,
} from '@/server/db/schema';
import {
  archiveLearningNode as archiveStructureNode,
  moveLearningNode as moveStructureNode,
  reorderLearningNodes as reorderStructureNodes,
  restoreLearningNode as restoreStructureNode,
  saveLearningNode as saveStructureNode,
  setLearningNodePublication as setStructureNodePublication,
  setFeaturedCourse as setFeaturedCourseAction,
  publishNodeDraft as publishNodeDraftAction,
  discardNodeDraft as discardNodeDraftAction,
  restorePreviousNodeVersion as restorePreviousNodeVersionAction,
} from './structure-actions';
import {
  archiveSllBanner,
  discardSllBannerDraft,
  moveSllBanner,
  publishSllBanner,
  restoreSllBannerVersion,
  restoreSllBanner,
  reorderSllBanners,
  saveSllBanner,
} from './banner-actions';
import {
  archiveSllResource,
  discardSllResourceDraft,
  moveSllResource,
  publishSllResource,
  restoreSllResourceVersion,
  restoreSllResource,
  reorderSllResources,
  saveSllResource,
} from './resource-actions';
import {
  discardSllCopyDraft,
  publishSllCopy,
  restoreSllCopyVersion,
  saveSllCopy,
} from './copy-actions';
import type { BannerActionState, ResourceActionState } from '../structure-types';

export type LessonEditState = { message: string; saved: boolean };

export type ProductAccessState = { message: string; saved: boolean; currentAccess?: string[] };

/** Altera só o produto escolhido e guarda o motivo junto da identidade admin. */
export async function changeStudentProductAccess(
  _previous: ProductAccessState,
  formData: FormData,
): Promise<ProductAccessState> {
  const session = await requireAdmin('/admin/acessos');
  const emailValue = formData.get('email');
  const productValue = formData.get('product');
  const actionValue = formData.get('action');
  const reasonValue = formData.get('reason');

  if (
    typeof emailValue !== 'string' ||
    typeof productValue !== 'string' ||
    !['sll', 'loja-pronta'].includes(productValue) ||
    typeof actionValue !== 'string' ||
    !['granted', 'revoked'].includes(actionValue) ||
    typeof reasonValue !== 'string'
  ) {
    return { message: 'Confira os campos e tente de novo.', saved: false };
  }

  const email = emailValue.trim().toLowerCase();
  const reason = reasonValue.trim();
  if (!email || !email.includes('@') || reason.length < 3 || reason.length > 500) {
    return { message: 'Informe um email válido e um motivo de 3 a 500 caracteres.', saved: false };
  }

  const target = await db.query.user.findFirst({
    columns: { id: true },
    where: eq(user.email, email),
  });
  if (!target) return { message: 'Não encontrei uma conta com esse email.', saved: false };

  const product = productValue as 'sll' | 'loja-pronta';
  const action = actionValue as 'granted' | 'revoked';
  // 'purchase': já tinha acesso pela compra e agora a liberação manual também ficou guardada.
  const outcome = await db.transaction(
    async (tx): Promise<'changed' | 'purchase' | 'unchanged'> => {
      let result: 'changed' | 'purchase' = 'changed';
      // Mesma trava do aviso da Hotmart, para os dois não recalcularem o acesso ao mesmo tempo.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${target.id}))`);
      if (action === 'granted') {
        const [inserted] = await tx
          .insert(studentProducts)
          .values({ userId: target.id, product })
          .onConflictDoNothing()
          .returning({ userId: studentProducts.userId });
        // A liberação manual fica guardada mesmo quando a compra já dava acesso: assim um
        // reembolso depois não tira o que a admin quis garantir.
        const [granted] = await tx
          .insert(manualProductGrants)
          .values({ userId: target.id, product })
          .onConflictDoNothing()
          .returning({ userId: manualProductGrants.userId });
        if (!inserted && !granted) return 'unchanged';
        if (!inserted) result = 'purchase';
      } else {
        const removed = await tx
          .delete(studentProducts)
          .where(and(eq(studentProducts.userId, target.id), eq(studentProducts.product, product)))
          .returning({ userId: studentProducts.userId });
        if (removed.length === 0) return 'unchanged';
        await tx
          .delete(manualProductGrants)
          .where(
            and(
              eq(manualProductGrants.userId, target.id),
              eq(manualProductGrants.product, product),
            ),
          );
        // Encerra as compras da Hotmart que davam este acesso. Sem isso, um aviso seguinte da
        // mesma compra (como o fim da garantia) liberaria o acesso de novo.
        const mappedCodes = await tx.query.hotmartProductMappings.findMany({
          columns: { productUcode: true },
          where: eq(hotmartProductMappings.access, product),
        });
        if (mappedCodes.length)
          await tx
            .update(hotmartPurchases)
            .set({ active: false, updatedAt: new Date() })
            .where(
              and(
                eq(hotmartPurchases.userId, target.id),
                eq(hotmartPurchases.active, true),
                inArray(
                  hotmartPurchases.productUcode,
                  mappedCodes.map((item) => item.productUcode),
                ),
              ),
            );
      }

      await tx.insert(productAccessEvents).values({
        id: randomUUID(),
        targetUserId: target.id,
        actorUserId: session.user.id,
        product,
        action,
        reason,
      });
      return result;
    },
  );

  const access = await db.query.studentProducts.findMany({
    columns: { product: true },
    where: eq(studentProducts.userId, target.id),
  });
  revalidatePath('/admin/acessos');
  revalidatePath('/');
  return {
    message:
      outcome === 'purchase'
        ? 'Essa conta já tinha acesso pela compra. A liberação manual foi registrada e continua valendo se a compra for reembolsada.'
        : outcome === 'changed'
          ? action === 'granted'
            ? 'Acesso liberado e alteração registrada.'
            : 'Acesso removido e alteração registrada.'
          : action === 'granted'
            ? 'Essa conta já tinha esse acesso. Nenhuma alteração foi feita.'
            : 'Essa conta já não tinha esse acesso. Nenhuma alteração foi feita.',
    saved: outcome !== 'unchanged',
    currentAccess: access.map((item) => item.product),
  };
}

/** Mostra somente as 30 mudanças mais recentes a quem já passou pela guarda de admin. */
export async function getRecentProductAccessEvents() {
  await requireAdmin();
  return db
    .select({
      id: productAccessEvents.id,
      email: user.email,
      name: user.name,
      product: productAccessEvents.product,
      action: productAccessEvents.action,
      reason: productAccessEvents.reason,
      createdAt: productAccessEvents.createdAt,
    })
    .from(productAccessEvents)
    .innerJoin(user, eq(productAccessEvents.targetUserId, user.id))
    .orderBy(desc(productAccessEvents.createdAt))
    .limit(30);
}

/** Salva os campos básicos e os blocos de texto/link sem tocar nos outros materiais da aula. */
export async function saveLearningLesson(
  _previous: LessonEditState,
  formData: FormData,
): Promise<LessonEditState> {
  await requireAdmin();

  const lessonId = formData.get('lessonId');
  const blockIds = formData.getAll('blockId');
  if (typeof lessonId !== 'string' || blockIds.some((id) => typeof id !== 'string')) {
    return { message: 'Não foi possível ler os dados desta aula.', saved: false };
  }

  const blocks = blockIds.map((id) => {
    const blockKind = formData.get(`block:${id}:kind`);
    if (blockKind === 'text') {
      return { id, kind: 'text' as const, text: formData.get(`block:${id}:text`) };
    }
    if (blockKind === 'video') {
      return {
        id,
        kind: 'video' as const,
        provider: 'pandavideo' as const,
        videoId: formData.get(`block:${id}:videoId`),
        note: formData.get(`block:${id}:note`),
      };
    }
    if (blockKind === 'file') {
      return {
        id,
        kind: 'file' as const,
        fileName: formData.get(`block:${id}:fileName`),
        attachedTo: formData.get(`block:${id}:attachedTo`),
      };
    }
    if (blockKind === 'image') {
      return { id, kind: 'image' as const, alt: formData.get(`block:${id}:alt`) };
    }
    return {
      id,
      kind: 'link' as const,
      label: formData.get(`block:${id}:label`),
      url: formData.get(`block:${id}:url`),
      note: formData.get(`block:${id}:note`),
    };
  });

  const newBlocks = formData.getAll('newBlockKind').map((kind, index) => {
    if (kind === 'text') {
      return {
        kind,
        text: formData.get(`newBlock:${index}:text`),
      };
    }
    if (kind === 'video') {
      return {
        kind,
        provider: 'pandavideo' as const,
        videoId: formData.get(`newBlock:${index}:videoId`),
        note: formData.get(`newBlock:${index}:note`),
      };
    }
    return {
      kind,
      label: formData.get(`newBlock:${index}:label`),
      url: formData.get(`newBlock:${index}:url`),
      note: formData.get(`newBlock:${index}:note`),
    };
  });

  const parsed = parseLessonEdit({
    lessonId,
    title: formData.get('title'),
    description: formData.get('description'),
    blocks: [...blocks, ...newBlocks],
  });
  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message ?? 'Confira os campos e tente de novo.',
      saved: false,
    };
  }

  const lesson = await db.query.learningLessons.findFirst({
    columns: { id: true, status: true },
    where: eq(learningLessons.id, parsed.data.lessonId),
  });
  if (!lesson) return { message: 'Esta aula não está disponível.', saved: false };

  const editableBlocks = await getEditableLessonBlocks(lesson.id);
  const editableIds = editableBlocks
    .filter((block) => ['text', 'link', 'video', 'file', 'image'].includes(block.kind))
    .map((block) => block.id)
    .toSorted();
  const submittedIds = parsed.data.blocks
    .flatMap((block) => (block.id ? [block.id] : []))
    .toSorted();
  if (
    editableIds.length !== submittedIds.length ||
    editableIds.some((id, index) => id !== submittedIds[index])
  ) {
    return { message: 'O conteúdo mudou. Atualize a página e tente de novo.', saved: false };
  }
  const attachmentTargets = new Set(
    editableBlocks
      .filter((block) => block.kind === 'link' || block.kind === 'video')
      .map((block) => block.id),
  );
  if (
    parsed.data.blocks.some(
      (block) =>
        block.kind === 'file' && block.attachedTo && !attachmentTargets.has(block.attachedTo),
    )
  ) {
    return { message: 'Escolha um vídeo ou link desta aula para o arquivo.', saved: false };
  }

  if (lesson.status === 'published') {
    const draftBlocks = parsed.data.blocks.map((edited, position) => {
      const original = edited.id ? editableBlocks.find((block) => block.id === edited.id) : null;
      if (edited.id && (!original || original.kind !== edited.kind))
        throw new Error('O material mudou. Atualize a página.');
      const originalData = (original?.data ?? {}) as Record<string, unknown>;
      let blockData: LearningContentBlockData;
      if (edited.kind === 'text') blockData = { text: edited.text };
      else if (edited.kind === 'link')
        blockData = { label: edited.label, url: edited.url, note: edited.note };
      else if (edited.kind === 'video')
        blockData = { provider: 'pandavideo', videoId: edited.videoId, note: edited.note };
      else if (edited.kind === 'file') {
        if (typeof originalData.storageKey !== 'string') throw new Error('Arquivo sem material.');
        blockData = {
          storageKey: originalData.storageKey,
          contentType: String(originalData.contentType ?? 'application/octet-stream'),
          size: Number(originalData.size ?? 0),
          fileName: edited.fileName,
          ...(edited.attachedTo ? { attachedTo: edited.attachedTo } : {}),
        };
      } else {
        if (typeof originalData.storageKey !== 'string') throw new Error('Imagem sem arquivo.');
        blockData = {
          storageKey: originalData.storageKey,
          contentType: String(originalData.contentType ?? 'image/webp'),
          size: Number(originalData.size ?? 0),
          alt: edited.alt,
        };
      }
      return {
        id: edited.id ?? randomUUID(),
        kind: edited.kind,
        data: blockData,
        position,
      };
    });
    await saveNodeDraft('lesson', lesson.id, {
      title: parsed.data.title,
      description: parsed.data.description,
      blocks: draftBlocks,
    });
    revalidatePath('/admin');
    return { message: 'Rascunho salvo. Publique para mostrar às alunas.', saved: true };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(learningLessons)
      .set({
        title: parsed.data.title,
        description: parsed.data.description,
      })
      .where(eq(learningLessons.id, lesson.id));

    let nextPosition = Math.max(-1, ...editableBlocks.map((block) => block.position)) + 1;
    for (const edited of parsed.data.blocks) {
      if (!edited.id) {
        if (edited.kind === 'text') {
          await tx.insert(learningContentBlocks).values({
            lessonId: lesson.id,
            kind: 'text',
            data: { text: edited.text },
            position: nextPosition++,
          });
        } else if (edited.kind === 'link') {
          await tx.insert(learningContentBlocks).values({
            lessonId: lesson.id,
            kind: 'link',
            data: { label: edited.label, url: edited.url, note: edited.note },
            position: nextPosition++,
          });
        } else if (edited.kind === 'video') {
          await tx.insert(learningContentBlocks).values({
            lessonId: lesson.id,
            kind: 'video',
            data: { provider: 'pandavideo', videoId: edited.videoId, note: edited.note },
            position: nextPosition++,
          });
        }
        continue;
      }
      const original = editableBlocks.find((block) => block.id === edited.id);
      if (!original || original.kind !== edited.kind) throw new Error('Tipo de bloco alterado.');
      const originalData = original.data as Record<string, unknown>;
      let data: LearningContentBlockData;
      if (edited.kind === 'text') data = { text: edited.text };
      else if (edited.kind === 'link')
        data = { url: edited.url, label: edited.label, note: edited.note };
      else if (edited.kind === 'video')
        data = { provider: 'pandavideo', videoId: edited.videoId, note: edited.note };
      else if (edited.kind === 'image') {
        if (typeof originalData.storageKey !== 'string') throw new Error('Imagem sem arquivo.');
        data = {
          storageKey: originalData.storageKey,
          contentType:
            typeof originalData.contentType === 'string' ? originalData.contentType : 'image/webp',
          size: typeof originalData.size === 'number' ? originalData.size : 0,
          alt: edited.alt,
        };
      } else {
        if (typeof originalData.storageKey !== 'string') throw new Error('Arquivo sem material.');
        data = {
          storageKey: originalData.storageKey,
          contentType:
            typeof originalData.contentType === 'string'
              ? originalData.contentType
              : 'application/octet-stream',
          size: typeof originalData.size === 'number' ? originalData.size : 0,
          fileName: edited.fileName,
          ...(edited.attachedTo ? { attachedTo: edited.attachedTo } : {}),
        };
      }
      await tx
        .update(learningContentBlocks)
        .set({ data })
        .where(
          and(
            eq(learningContentBlocks.id, edited.id),
            eq(learningContentBlocks.lessonId, lesson.id),
          ),
        );
    }
  });

  revalidatePath('/admin');
  return { message: 'A aula foi salva.', saved: true };
}

/** Reordena somente os materiais da aula informada. */
export async function reorderLessonBlocks(formData: FormData): Promise<LessonEditState> {
  await requireAdmin();
  const lessonId = z.uuid().safeParse(formData.get('lessonId'));
  const ids = formData.getAll('id');
  if (
    !lessonId.success ||
    ids.some((id) => typeof id !== 'string' || !z.uuid().safeParse(id).success)
  ) {
    return { saved: false, message: 'Atualize a aula e tente de novo.' };
  }
  const lesson = await db.query.learningLessons.findFirst({
    columns: { status: true },
    where: eq(learningLessons.id, lessonId.data),
  });
  if (!lesson) return { saved: false, message: 'Aula não encontrada.' };
  if (lesson.status === 'published') {
    const current = await getEditableLessonBlocks(lessonId.data);
    const expected = new Set(current.map((block) => block.id));
    if (
      ids.length !== expected.size ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !expected.has(id as string))
    )
      return { saved: false, message: 'Os materiais mudaram. Atualize a aula e tente de novo.' };
    await saveNodeDraft('lesson', lessonId.data, {
      blocks: ids.map((id, position) => ({
        ...current.find((block) => block.id === id)!,
        position,
      })),
    });
    revalidatePath('/admin');
    return { saved: true, message: 'Nova ordem salva no rascunho.' };
  }
  const current = await db.query.learningContentBlocks.findMany({
    columns: { id: true },
    where: eq(learningContentBlocks.lessonId, lessonId.data),
  });
  const expected = new Set(current.map((block) => block.id));
  if (
    ids.length !== expected.size ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !expected.has(id as string))
  ) {
    return { saved: false, message: 'Os materiais mudaram. Atualize a aula e tente de novo.' };
  }
  await db.transaction(async (tx) => {
    for (const [position, id] of ids.entries()) {
      await tx
        .update(learningContentBlocks)
        .set({ position })
        .where(
          and(
            eq(learningContentBlocks.id, id as string),
            eq(learningContentBlocks.lessonId, lessonId.data),
          ),
        );
    }
  });
  revalidatePath('/admin');
  revalidatePath(`/sll/aula/${lessonId.data}`);
  return { saved: true, message: 'Ordem salva.' };
}

/** Remove um material e desvincula seus arquivos sem apagar o restante da aula. */
export async function removeLessonBlock(formData: FormData): Promise<LessonEditState> {
  await requireAdmin();
  const lessonId = z.uuid().safeParse(formData.get('lessonId'));
  const blockId = z.uuid().safeParse(formData.get('blockId'));
  if (!lessonId.success || !blockId.success) return { saved: false, message: 'Material inválido.' };
  const lesson = await db.query.learningLessons.findFirst({
    columns: { status: true },
    where: eq(learningLessons.id, lessonId.data),
  });
  if (!lesson) return { saved: false, message: 'Aula não encontrada.' };
  if (lesson.status === 'published') {
    const current = await getEditableLessonBlocks(lessonId.data);
    const block = current.find((item) => item.id === blockId.data);
    if (!block) return { saved: false, message: 'O material não está mais nesta aula.' };
    const blocks = current
      .filter((item) => item.id !== block.id)
      .map((item, position) => {
        if (
          item.kind === 'file' &&
          'attachedTo' in item.data &&
          item.data.attachedTo === block.id
        ) {
          const { attachedTo: _attachedTo, ...rest } = item.data;
          return { ...item, data: rest, position };
        }
        return { ...item, position };
      });
    await saveNodeDraft('lesson', lessonId.data, { blocks });
    revalidatePath('/admin');
    return { saved: true, message: 'Material removido do rascunho.' };
  }
  const block = await db.query.learningContentBlocks.findFirst({
    columns: { id: true, kind: true, data: true },
    where: and(
      eq(learningContentBlocks.id, blockId.data),
      eq(learningContentBlocks.lessonId, lessonId.data),
    ),
  });
  if (!block) return { saved: false, message: 'O material não está mais nesta aula.' };
  await db.transaction(async (tx) => {
    if (block.kind === 'link' || block.kind === 'video') {
      const files = await tx.query.learningContentBlocks.findMany({
        columns: { id: true, kind: true, data: true },
        where: eq(learningContentBlocks.lessonId, lessonId.data),
      });
      for (const file of files) {
        if (
          file.kind !== 'file' ||
          !('attachedTo' in file.data) ||
          file.data.attachedTo !== block.id
        )
          continue;
        const { attachedTo: _attachedTo, ...data } = file.data;
        await tx
          .update(learningContentBlocks)
          .set({ data })
          .where(eq(learningContentBlocks.id, file.id));
      }
    }
    await tx
      .delete(learningContentBlocks)
      .where(
        and(
          eq(learningContentBlocks.id, block.id),
          eq(learningContentBlocks.lessonId, lessonId.data),
        ),
      );
  });
  if (
    (block.kind === 'file' || block.kind === 'image') &&
    'storageKey' in block.data &&
    typeof block.data.storageKey === 'string'
  ) {
    await storage()
      .remove(block.data.storageKey)
      .catch((error: unknown) => {
        console.error(
          `[learning-content] arquivo não removido: ${error instanceof Error ? error.name : 'erro'}`,
        );
      });
  }
  revalidatePath('/admin');
  revalidatePath(`/sll/aula/${lessonId.data}`);
  return { saved: true, message: 'Material removido.' };
}

export async function saveLearningNode(previous: LessonEditState, data: FormData) {
  return saveStructureNode(previous, data);
}

export async function archiveLearningNode(data: FormData) {
  return archiveStructureNode(data);
}

export async function restoreLearningNode(data: FormData) {
  return restoreStructureNode(data);
}

export async function moveLearningNode(data: FormData) {
  return moveStructureNode(data);
}

export async function reorderLearningNodes(data: FormData) {
  return reorderStructureNodes(data);
}

export async function setLearningNodePublication(data: FormData) {
  return setStructureNodePublication(data);
}

export async function setFeaturedCourse(data: FormData) {
  return setFeaturedCourseAction(data);
}

export async function publishNodeDraft(data: FormData) {
  return publishNodeDraftAction(data);
}

export async function discardNodeDraft(data: FormData) {
  return discardNodeDraftAction(data);
}

export async function restorePreviousNodeVersion(data: FormData) {
  return restorePreviousNodeVersionAction(data);
}

export async function saveSllBannerForm(
  previous: BannerActionState,
  data: FormData,
): Promise<BannerActionState> {
  return saveSllBanner(previous, data);
}

export async function archiveSllBannerForm(data: FormData): Promise<void> {
  await archiveSllBanner(data);
}

export async function publishSllBannerForm(data: FormData): Promise<void> {
  await publishSllBanner(data);
}

export async function discardSllBannerDraftForm(data: FormData): Promise<void> {
  await discardSllBannerDraft(data);
}

export async function restoreSllBannerVersionForm(data: FormData): Promise<void> {
  await restoreSllBannerVersion(data);
}

export async function restoreSllBannerForm(data: FormData): Promise<void> {
  await restoreSllBanner(data);
}

export async function moveSllBannerForm(data: FormData): Promise<void> {
  await moveSllBanner(data);
}

export async function reorderSllBannersForm(data: FormData) {
  return reorderSllBanners(data);
}

export async function reorderSllResourcesForm(data: FormData) {
  return reorderSllResources(data);
}

export async function saveSllCopyForm(
  previous: { saved: boolean; message: string },
  data: FormData,
) {
  return saveSllCopy(previous, data);
}

export async function publishSllCopyForm(data: FormData): Promise<void> {
  await publishSllCopy(data);
}

export async function discardSllCopyDraftForm(data: FormData): Promise<void> {
  await discardSllCopyDraft(data);
}

export async function restoreSllCopyVersionForm(data: FormData): Promise<void> {
  await restoreSllCopyVersion(data);
}

export async function saveSllResourceForm(
  previous: ResourceActionState,
  data: FormData,
): Promise<ResourceActionState> {
  return saveSllResource(previous, data);
}

export async function archiveSllResourceForm(data: FormData): Promise<void> {
  await archiveSllResource(data);
}

export async function publishSllResourceForm(data: FormData): Promise<void> {
  await publishSllResource(data);
}

export async function discardSllResourceDraftForm(data: FormData): Promise<void> {
  await discardSllResourceDraft(data);
}

export async function restoreSllResourceVersionForm(data: FormData): Promise<void> {
  await restoreSllResourceVersion(data);
}

export async function restoreSllResourceForm(data: FormData): Promise<void> {
  await restoreSllResource(data);
}

export async function moveSllResourceForm(data: FormData): Promise<void> {
  await moveSllResource(data);
}
