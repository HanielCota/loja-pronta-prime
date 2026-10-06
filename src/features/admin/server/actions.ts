'use server';

import { and, asc, eq } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from './access';
import { parseLessonEdit } from '../lesson-edit';
import { lessonPublicationIssue } from '../publication-rules';
import { db } from '@/server/db';
import {
  learningContentBlocks,
  learningLessons,
  productAccessEvents,
  studentProducts,
  user,
  type LearningContentBlockData,
} from '@/server/db/schema';
import {
  archiveLearningNode as archiveStructureNode,
  moveLearningNode as moveStructureNode,
  restoreLearningNode as restoreStructureNode,
  saveLearningNode as saveStructureNode,
  setLearningNodePublication as setStructureNodePublication,
} from './structure-actions';
import { archiveSllBanner, moveSllBanner, saveSllBanner } from './banner-actions';
import { archiveSllResource, moveSllResource, saveSllResource } from './resource-actions';
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
  const changed = await db.transaction(async (tx) => {
    if (action === 'granted') {
      const [inserted] = await tx
        .insert(studentProducts)
        .values({ userId: target.id, product })
        .onConflictDoNothing()
        .returning({ userId: studentProducts.userId });
      if (!inserted) return false;
    } else {
      const removed = await tx
        .delete(studentProducts)
        .where(and(eq(studentProducts.userId, target.id), eq(studentProducts.product, product)))
        .returning({ userId: studentProducts.userId });
      if (removed.length === 0) return false;
    }

    await tx.insert(productAccessEvents).values({
      id: randomUUID(),
      targetUserId: target.id,
      actorUserId: session.user.id,
      product,
      action,
      reason,
    });
    return true;
  });

  const access = await db.query.studentProducts.findMany({
    columns: { product: true },
    where: eq(studentProducts.userId, target.id),
  });
  revalidatePath('/admin/acessos');
  revalidatePath('/');
  return {
    message: changed
      ? action === 'granted'
        ? 'Acesso liberado e alteração registrada.'
        : 'Acesso removido e alteração registrada.'
      : action === 'granted'
        ? 'Essa conta já tinha esse acesso. Nenhuma alteração foi feita.'
        : 'Essa conta já não tinha esse acesso. Nenhuma alteração foi feita.',
    saved: changed,
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
      };
    }
    if (blockKind === 'file') {
      return { id, kind: 'file' as const, fileName: formData.get(`block:${id}:fileName`) };
    }
    if (blockKind === 'image') {
      return { id, kind: 'image' as const, alt: formData.get(`block:${id}:alt`) };
    }
    return {
      id,
      kind: 'link' as const,
      label: formData.get(`block:${id}:label`),
      url: formData.get(`block:${id}:url`),
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
      };
    }
    return {
      kind,
      label: formData.get(`newBlock:${index}:label`),
      url: formData.get(`newBlock:${index}:url`),
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
  let publicationIssue: string | null = null;

  const editableBlocks = await db.query.learningContentBlocks.findMany({
    columns: { id: true, kind: true, data: true, position: true },
    where: and(eq(learningContentBlocks.lessonId, lesson.id)),
  });
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

  const saved = await db
    .transaction(async (tx) => {
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
              data: { label: edited.label, url: edited.url },
              position: nextPosition++,
            });
          } else if (edited.kind === 'video') {
            await tx.insert(learningContentBlocks).values({
              lessonId: lesson.id,
              kind: 'video',
              data: { provider: 'pandavideo', videoId: edited.videoId },
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
        else if (edited.kind === 'link') data = { url: edited.url, label: edited.label };
        else if (edited.kind === 'video')
          data = { provider: 'pandavideo', videoId: edited.videoId };
        else if (edited.kind === 'image') {
          if (typeof originalData.storageKey !== 'string') throw new Error('Imagem sem arquivo.');
          data = {
            storageKey: originalData.storageKey,
            contentType:
              typeof originalData.contentType === 'string'
                ? originalData.contentType
                : 'image/webp',
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

      // Aula publicada já aparece pras alunas: a edição passa pelas mesmas checagens da
      // publicação, senão um vídeo sem ID ou um link vazio entraria direto na tela delas.
      if (lesson.status !== 'published') return true;
      const result = await tx.query.learningLessons.findFirst({
        columns: { title: true, description: true },
        where: eq(learningLessons.id, lesson.id),
        with: {
          blocks: {
            columns: { kind: true, data: true },
            orderBy: [asc(learningContentBlocks.position), asc(learningContentBlocks.id)],
          },
        },
      });
      publicationIssue = result
        ? lessonPublicationIssue(
            result.title,
            result.description,
            result.blocks.map((block) => ({
              kind: block.kind,
              data: block.data as Record<string, unknown>,
            })),
          )
        : 'Esta aula não está disponível.';
      if (!publicationIssue) return true;
      tx.rollback();
      return false;
    })
    .catch((error: unknown) => {
      if (publicationIssue) return false;
      throw error;
    });
  if (!saved) {
    return {
      message: `Esta aula está publicada. ${publicationIssue ?? 'Confira os campos e tente de novo.'}`,
      saved: false,
    };
  }

  revalidatePath('/admin');
  return { message: 'A aula foi salva.', saved: true };
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

export async function setLearningNodePublication(data: FormData) {
  return setStructureNodePublication(data);
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

export async function moveSllBannerForm(data: FormData): Promise<void> {
  await moveSllBanner(data);
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

export async function moveSllResourceForm(data: FormData): Promise<void> {
  await moveSllResource(data);
}
