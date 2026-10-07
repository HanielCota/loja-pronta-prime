'use server';

import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import {
  learningLessons,
  learningNodeDrafts,
  learningNodeHistory,
  learningResourceLessons,
  learningResources,
  type LearningNodeDraftData,
} from '@/server/db/schema';
import { parseEditorIntent } from '../editor-intent';
import { learningSlugFromTitle, swapWithNeighbor } from '../structure-rules';
import { requireAdmin } from './access';
import {
  getNodeDraftForUpdate,
  saveNodeDraft,
  withNodeDraftLock,
  type DbTransaction,
} from './node-drafts';

import type {
  EditorActionState,
  ResourceActionState,
  StructureActionState,
} from '../structure-types';

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
  if (parsed.data.destination && !parsed.data.buttonLabel) {
    return {
      message: 'Dê um nome à ação do botão quando o recurso tiver um destino.',
      saved: false,
    };
  }
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
  // O grupo (chave) e a posição mudam só pela lista, que grava direto no recurso. Eles entram
  // apenas na criação; no rascunho, seriam valores velhos que a publicação ignoraria.
  const values = {
    groupTitle: parsed.data.groupTitle,
    title: parsed.data.title,
    description: parsed.data.description,
    buttonLabel: parsed.data.buttonLabel || null,
    destination: parsed.data.destination || null,
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
        .values({
          ...values,
          groupKey: sameGroup?.groupKey ?? parsed.data.groupKey,
          position: parsed.data.position,
          slug,
          status: 'draft',
        })
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

/** Passa o rascunho do recurso para a versão principal (textos e aulas ligadas) e o apaga. */
async function applyResourceDraft(
  tx: DbTransaction,
  resource: typeof learningResources.$inferSelect,
  data: LearningNodeDraftData | undefined,
  extra: { status: 'draft' | 'published'; archivedAt?: Date },
) {
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
      ...extra,
    })
    .where(eq(learningResources.id, resource.id));
  // Só a publicação renomeia o grupo inteiro; arquivar não mexe nos outros recursos.
  if (
    extra.status === 'published' &&
    data?.groupTitle !== undefined &&
    data.groupTitle !== resource.groupTitle
  )
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
      .where(eq(learningResourceLessons.resourceId, resource.id));
    for (const lessonId of data.relatedLessonIds)
      await tx.insert(learningResourceLessons).values({ resourceId: resource.id, lessonId });
  }
  await tx
    .delete(learningNodeDrafts)
    .where(
      and(eq(learningNodeDrafts.kind, 'resource'), eq(learningNodeDrafts.nodeId, resource.id)),
    );
}

const unavailable = {
  saved: false,
  message: 'Este recurso não está disponível. Atualize a página.',
};

function formResourceId(form: FormData) {
  const id = z.string().uuid().safeParse(form.get('id'));
  return id.success ? id.data : null;
}

/**
 * Publica o rascunho (ou, em `replacement`, a versão anterior) numa transação com o rascunho
 * travado e relido lá dentro. A versão atual continua visível até a troca completa, e se a
 * conferência falhar nada é gravado, nem um rascunho com a versão anterior.
 */
async function publishResource(
  id: string,
  replacement?: LearningNodeDraftData,
): Promise<StructureActionState> {
  return withNodeDraftLock('resource', id, async (tx) => {
    const resource = await tx.query.learningResources.findFirst({
      where: and(eq(learningResources.id, id), isNull(learningResources.archivedAt)),
    });
    if (!resource) return unavailable;
    const draft = await getNodeDraftForUpdate(tx, 'resource', id);
    if (replacement && draft)
      return {
        saved: false,
        message: 'Descarte ou publique o rascunho antes de voltar à versão anterior.',
      };
    const data = replacement ?? draft?.data;
    const destination = data?.destination === undefined ? resource.destination : data.destination;
    const buttonLabel = data?.buttonLabel === undefined ? resource.buttonLabel : data.buttonLabel;
    if (destination && !buttonLabel?.trim())
      return {
        saved: false,
        message: 'Dê um nome à ação do botão antes de publicar o destino.',
      };
    if (destination && !safeDestination(destination))
      return { saved: false, message: 'Confira o destino do recurso e salve antes de publicar.' };
    const currentLinks = await tx.query.learningResourceLessons.findMany({
      columns: { lessonId: true },
      where: eq(learningResourceLessons.resourceId, id),
    });
    const previous = {
      groupTitle: resource.groupTitle,
      title: resource.title,
      description: resource.description,
      buttonLabel: resource.buttonLabel,
      destination: resource.destination,
      relatedLessonIds: currentLinks.map((link) => link.lessonId),
    };
    await tx
      .insert(learningNodeHistory)
      .values({ kind: 'resource', nodeId: id, data: previous })
      .onConflictDoUpdate({
        target: [learningNodeHistory.kind, learningNodeHistory.nodeId],
        set: { data: previous },
      });
    await applyResourceDraft(tx, resource, data, { status: 'published' });
    return { saved: true, message: '' };
  });
}

export async function publishSllResource(form: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const id = formResourceId(form);
  if (!id) return unavailable;
  const result = await publishResource(id);
  if (!result.saved) return result;
  revalidatePath('/admin/recursos');
  revalidatePath('/sll/recursos');
  return { saved: true, message: 'Recurso publicado. As alunas já veem esta versão.' };
}

export async function discardSllResourceDraft(form: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const id = formResourceId(form);
  if (!id) return unavailable;
  const removed = await db
    .delete(learningNodeDrafts)
    .where(and(eq(learningNodeDrafts.kind, 'resource'), eq(learningNodeDrafts.nodeId, id)))
    .returning({ nodeId: learningNodeDrafts.nodeId });
  if (!removed.length) return { saved: false, message: 'Não há rascunho para descartar.' };
  revalidatePath('/admin/recursos');
  return { saved: true, message: 'Rascunho descartado. A versão publicada continua igual.' };
}

export async function restoreSllResourceVersion(form: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const id = formResourceId(form);
  if (!id) return unavailable;
  const previous = await db.query.learningNodeHistory.findFirst({
    where: and(eq(learningNodeHistory.kind, 'resource'), eq(learningNodeHistory.nodeId, id)),
  });
  if (!previous) return { saved: false, message: 'Não há versão anterior deste recurso.' };
  const result = await publishResource(id, previous.data);
  if (!result.saved) return result;
  revalidatePath('/admin/recursos');
  revalidatePath('/sll/recursos');
  return { saved: true, message: 'A versão anterior do recurso voltou para as alunas.' };
}

export async function archiveSllResource(form: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const id = formResourceId(form);
  if (!id) return unavailable;
  const archived = await withNodeDraftLock('resource', id, async (tx) => {
    const resource = await tx.query.learningResources.findFirst({
      where: and(eq(learningResources.id, id), isNull(learningResources.archivedAt)),
    });
    if (!resource) return false;
    // O recurso volta como rascunho: as edições pendentes passam para ele, senão um rascunho
    // antigo continuaria na tela e voltaria a valer na próxima publicação.
    const draft = await getNodeDraftForUpdate(tx, 'resource', id);
    await applyResourceDraft(tx, resource, draft?.data, {
      status: 'draft',
      archivedAt: new Date(),
    });
    return true;
  });
  if (!archived) return unavailable;
  revalidatePath('/admin/recursos');
  revalidatePath('/admin/arquivados');
  revalidatePath('/sll/recursos');
  return { saved: true, message: 'Recurso arquivado. Ele fica em Itens arquivados.' };
}

/** Só um recurso arquivado volta: em um ativo, isto o tiraria das alunas sem aviso. */
export async function restoreSllResource(form: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const id = formResourceId(form);
  if (!id) return unavailable;
  const restored = await db
    .update(learningResources)
    .set({ archivedAt: null, status: 'draft' })
    .where(and(eq(learningResources.id, id), isNotNull(learningResources.archivedAt)))
    .returning({ id: learningResources.id });
  if (!restored.length) return { saved: false, message: 'Este recurso não está arquivado.' };
  revalidatePath('/admin/arquivados');
  revalidatePath('/admin/recursos');
  return { saved: true, message: 'Recurso restaurado como rascunho.' };
}

export async function moveSllResource(
  form: FormData,
  direction: 'up' | 'down',
): Promise<StructureActionState> {
  await requireAdmin();
  const id = formResourceId(form);
  if (!id) return unavailable;
  const resource = await db.query.learningResources.findFirst({
    columns: { id: true, groupKey: true },
    where: and(eq(learningResources.id, id), isNull(learningResources.archivedAt)),
  });
  if (!resource) return unavailable;
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
    id,
    direction,
  );
  if (!reordered)
    return {
      saved: false,
      message:
        direction === 'up'
          ? 'Este recurso já é o primeiro do grupo.'
          : 'Este recurso já é o último do grupo.',
    };
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
  return {
    saved: true,
    message: direction === 'up' ? 'Recurso movido para cima.' : 'Recurso movido para baixo.',
  };
}

/**
 * Os botões abaixo do editor mandam a ação em `intent`. Um só formulário com estado deixa a
 * resposta (deu certo ou o que falta) aparecer na tela e no leitor de tela, também sem
 * JavaScript.
 */
export async function runSllResourceAction(
  _previous: EditorActionState,
  form: FormData,
): Promise<EditorActionState> {
  const intent = parseEditorIntent(form.get('intent'));
  if (!intent) return { saved: false, message: 'Atualize a página e tente de novo.' };
  try {
    const result =
      intent === 'publish'
        ? await publishSllResource(form)
        : intent === 'discard'
          ? await discardSllResourceDraft(form)
          : intent === 'restore'
            ? await restoreSllResourceVersion(form)
            : intent === 'archive'
              ? await archiveSllResource(form)
              : await moveSllResource(form, intent);
    return { ...result, intent };
  } catch (error) {
    // Sessão vencida: o requireAdmin redireciona para a entrada, e isso não é uma falha.
    unstable_rethrow(error);
    return { saved: false, message: 'Não consegui concluir. Atualize a página e tente de novo.' };
  }
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
