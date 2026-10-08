'use server';

import { and, asc, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { revalidateSllContent } from '@/features/sll/server/content-cache';
import { z } from 'zod';
import { db } from '@/server/db';
import {
  learningContentBlocks,
  learningLessons,
  learningModules,
  learningNodeDrafts,
  learningNodeHistory,
  learningStages,
  learningTracks,
  type LearningNodeDraftData,
} from '@/server/db/schema';
import { requireAdmin } from './access';
import { learningSlugFromTitle } from '../structure-rules';
import { lessonPublicationIssue } from '../publication-rules';
import {
  getNodeDraft,
  getNodeDraftForUpdate,
  saveNodeDraft,
  withNodeDraftLock,
} from './node-drafts';

import type { LearningNodeKind, LearningTrackKind, StructureActionState } from '../structure-types';

const uuidSchema = z.string().uuid();
const titleSchema = z
  .string()
  .trim()
  .min(1, 'Escreva um nome.')
  .max(160, 'Use até 160 caracteres.');
const descriptionSchema = z.string().trim().max(1200, 'Use até 1.200 caracteres.');

function stringField(data: FormData, key: string): string | null {
  const value = data.get(key);
  return typeof value === 'string' ? value : null;
}

async function unusedSlug(
  kind: LearningNodeKind,
  parentId: string | null,
  title: string,
): Promise<string> {
  const base = learningSlugFromTitle(title);
  const slugs =
    kind === 'track'
      ? (await db.query.learningTracks.findMany({ columns: { slug: true } })).map((row) => row.slug)
      : kind === 'stage'
        ? (
            await db.query.learningStages.findMany({
              columns: { slug: true },
              where: eq(learningStages.trackId, parentId!),
            })
          ).map((row) => row.slug)
        : kind === 'module'
          ? (
              await db.query.learningModules.findMany({
                columns: { slug: true },
                where: eq(learningModules.stageId, parentId!),
              })
            ).map((row) => row.slug)
          : (
              await db.query.learningLessons.findMany({
                columns: { slug: true },
                where: eq(learningLessons.moduleId, parentId!),
              })
            ).map((row) => row.slug);

  const taken = new Set(slugs);
  if (!taken.has(base)) return base;
  for (let suffix = 2; suffix < 10_000; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('Não consegui criar um endereço para este conteúdo.');
}

async function nextPosition(kind: LearningNodeKind, parentId: string | null): Promise<number> {
  if (kind === 'track') {
    const last = await db.query.learningTracks.findFirst({
      columns: { position: true },
      orderBy: [desc(learningTracks.position)],
    });
    return (last?.position ?? -1) + 1;
  }
  if (kind === 'stage') {
    const last = await db.query.learningStages.findFirst({
      columns: { position: true },
      where: eq(learningStages.trackId, parentId!),
      orderBy: [desc(learningStages.position)],
    });
    return (last?.position ?? -1) + 1;
  }
  if (kind === 'module') {
    const last = await db.query.learningModules.findFirst({
      columns: { position: true },
      where: eq(learningModules.stageId, parentId!),
      orderBy: [desc(learningModules.position)],
    });
    return (last?.position ?? -1) + 1;
  }
  const last = await db.query.learningLessons.findFirst({
    columns: { position: true },
    where: eq(learningLessons.moduleId, parentId!),
    orderBy: [desc(learningLessons.position)],
  });
  return (last?.position ?? -1) + 1;
}

/** Cria ou renomeia um nível sem mover os filhos nem tocar nos materiais da aula. */
export async function saveLearningNode(
  _previous: StructureActionState,
  data: FormData,
): Promise<StructureActionState> {
  await requireAdmin();

  const kind = stringField(data, 'kind');
  const rawId = stringField(data, 'nodeId') ?? '';
  const parentId = stringField(data, 'parentId');
  const title = titleSchema.safeParse(stringField(data, 'title') ?? '');
  const description = descriptionSchema.safeParse(stringField(data, 'description') ?? '');
  const trackKind = stringField(data, 'trackKind');
  const durationText = stringField(data, 'durationMinutes') ?? '';
  const duration = durationText === '' ? null : Number(durationText);
  const countsTowardProgress = data.get('countsTowardProgress') === 'true';
  const relatedLessonId = stringField(data, 'relatedLessonId') || null;

  if (!['track', 'stage', 'module', 'lesson'].includes(kind ?? '')) {
    return { message: 'Escolha que tipo de conteúdo quer guardar.', saved: false };
  }
  const nodeKind = kind as LearningNodeKind;
  const editing = rawId !== '';
  if (editing && !uuidSchema.safeParse(rawId).success) {
    return { message: 'Este conteúdo não está disponível.', saved: false };
  }
  if (nodeKind !== 'track' && (!parentId || !uuidSchema.safeParse(parentId).success)) {
    return { message: 'A localização deste conteúdo não é válida.', saved: false };
  }
  if (!title.success)
    return {
      message: title.error.issues[0]?.message ?? 'Confira o nome.',
      saved: false,
      field: 'title',
    };
  if (!description.success) {
    return {
      message: description.error.issues[0]?.message ?? 'Confira a descrição.',
      saved: false,
      field: 'description',
    };
  }
  if (
    nodeKind === 'track' &&
    !['welcome', 'method', 'complementary_course'].includes(trackKind ?? '')
  ) {
    return { message: 'Escolha o tipo da trilha.', saved: false };
  }
  if (
    nodeKind === 'lesson' &&
    duration !== null &&
    (!Number.isInteger(duration) || duration < 1 || duration > 999)
  ) {
    return {
      message: 'A duração deve ser um número entre 1 e 999 minutos.',
      saved: false,
      field: 'durationMinutes',
    };
  }
  if (nodeKind === 'lesson' && relatedLessonId) {
    if (!uuidSchema.safeParse(relatedLessonId).success || relatedLessonId === rawId)
      return { message: 'Escolha outra aula relacionada.', saved: false, field: 'relatedLessonId' };
    const source = editing
      ? await db.query.learningLessons.findFirst({
          columns: { moduleId: true },
          where: and(eq(learningLessons.id, rawId), isNull(learningLessons.archivedAt)),
        })
      : { moduleId: parentId };
    const [sourceGroup, target] = await Promise.all([
      source?.moduleId
        ? db.query.learningModules.findFirst({
            columns: { id: true },
            where: eq(learningModules.id, source.moduleId),
            with: { stage: { columns: { trackId: true } } },
          })
        : null,
      db.query.learningLessons.findFirst({
        columns: { id: true },
        where: and(eq(learningLessons.id, relatedLessonId), isNull(learningLessons.archivedAt)),
        with: {
          module: {
            columns: { id: true },
            with: { stage: { columns: { trackId: true } } },
          },
        },
      }),
    ]);
    if (!sourceGroup || !target || sourceGroup.stage.trackId !== target.module.stage.trackId)
      return {
        message: 'Escolha uma aula do mesmo curso.',
        saved: false,
        field: 'relatedLessonId',
      };
  }

  if (editing) {
    const current =
      nodeKind === 'track'
        ? await db.query.learningTracks.findFirst({
            columns: { status: true },
            where: and(eq(learningTracks.id, rawId), isNull(learningTracks.archivedAt)),
          })
        : nodeKind === 'stage'
          ? await db.query.learningStages.findFirst({
              columns: { status: true },
              where: and(eq(learningStages.id, rawId), isNull(learningStages.archivedAt)),
            })
          : nodeKind === 'module'
            ? await db.query.learningModules.findFirst({
                columns: { status: true },
                where: and(eq(learningModules.id, rawId), isNull(learningModules.archivedAt)),
              })
            : await db.query.learningLessons.findFirst({
                columns: { status: true },
                where: and(eq(learningLessons.id, rawId), isNull(learningLessons.archivedAt)),
              });
    if (!current) return { message: 'Este conteúdo não está disponível.', saved: false };
    if (current.status === 'published') {
      await saveNodeDraft(nodeKind, rawId, {
        title: title.data,
        description: description.data || null,
        ...(nodeKind === 'lesson'
          ? { durationMinutes: duration, countsTowardProgress, relatedLessonId }
          : {}),
      });
      revalidatePath('/admin');
      return { message: 'Rascunho salvo. Publique para mostrar às alunas.', saved: true };
    }
  }

  try {
    if (!editing && nodeKind === 'stage') {
      const parent = await db.query.learningTracks.findFirst({
        columns: { id: true },
        where: and(eq(learningTracks.id, parentId!), isNull(learningTracks.archivedAt)),
      });
      if (!parent) return { message: 'A trilha escolhida não está disponível.', saved: false };
    }
    if (!editing && nodeKind === 'module') {
      const parent = await db.query.learningStages.findFirst({
        columns: { id: true },
        where: and(eq(learningStages.id, parentId!), isNull(learningStages.archivedAt)),
      });
      if (!parent) return { message: 'A etapa escolhida não está disponível.', saved: false };
    }
    if (!editing && nodeKind === 'lesson') {
      const parent = await db.query.learningModules.findFirst({
        columns: { id: true },
        where: and(eq(learningModules.id, parentId!), isNull(learningModules.archivedAt)),
      });
      if (!parent) return { message: 'O módulo escolhido não está disponível.', saved: false };
    }

    const slug = editing ? null : await unusedSlug(nodeKind, parentId, title.data);
    const position = editing ? null : await nextPosition(nodeKind, parentId);

    if (nodeKind === 'track') {
      if (editing) {
        const updated = await db
          .update(learningTracks)
          .set({
            kind: trackKind as LearningTrackKind,
            title: title.data,
            description: description.data || null,
          })
          .where(and(eq(learningTracks.id, rawId), isNull(learningTracks.archivedAt)))
          .returning({ id: learningTracks.id });
        if (updated.length === 0)
          return { message: 'Esta trilha não está disponível.', saved: false };
      } else {
        await db.insert(learningTracks).values({
          kind: trackKind as LearningTrackKind,
          title: title.data,
          description: description.data || null,
          slug: slug!,
          position: position!,
        });
      }
    } else if (nodeKind === 'stage') {
      if (editing) {
        const updated = await db
          .update(learningStages)
          .set({ title: title.data, description: description.data || null })
          .where(and(eq(learningStages.id, rawId), isNull(learningStages.archivedAt)))
          .returning({ id: learningStages.id });
        if (updated.length === 0)
          return { message: 'Esta etapa não está disponível.', saved: false };
      } else {
        await db.insert(learningStages).values({
          trackId: parentId!,
          title: title.data,
          description: description.data || null,
          slug: slug!,
          position: position!,
        });
      }
    } else if (nodeKind === 'module') {
      if (editing) {
        const updated = await db
          .update(learningModules)
          .set({ title: title.data, description: description.data || null })
          .where(and(eq(learningModules.id, rawId), isNull(learningModules.archivedAt)))
          .returning({ id: learningModules.id });
        if (updated.length === 0)
          return { message: 'Este módulo não está disponível.', saved: false };
      } else {
        await db.insert(learningModules).values({
          stageId: parentId!,
          title: title.data,
          description: description.data || null,
          slug: slug!,
          position: position!,
        });
      }
    } else if (editing) {
      const updated = await db
        .update(learningLessons)
        .set({
          title: title.data,
          description: description.data || null,
          durationMinutes: duration,
          countsTowardProgress,
          relatedLessonId,
        })
        .where(and(eq(learningLessons.id, rawId), isNull(learningLessons.archivedAt)))
        .returning({ id: learningLessons.id });
      if (updated.length === 0) return { message: 'Esta aula não está disponível.', saved: false };
    } else {
      await db.insert(learningLessons).values({
        moduleId: parentId!,
        title: title.data,
        description: description.data || null,
        durationMinutes: duration,
        countsTowardProgress,
        relatedLessonId,
        slug: slug!,
        position: position!,
      });
    }
  } catch {
    return { message: 'Não consegui guardar. Atualize a página e tente de novo.', saved: false };
  }

  revalidatePath('/admin');
  return {
    message: editing ? 'As alterações foram salvas.' : 'O conteúdo foi adicionado.',
    saved: true,
  };
}

/** Arquiva sem apagar filhos e materiais; a área de itens arquivados permite restaurar. */
export async function archiveLearningNode(data: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const kind = stringField(data, 'kind');
  const id = stringField(data, 'nodeId');
  if (
    !id ||
    !uuidSchema.safeParse(id).success ||
    !['track', 'stage', 'module', 'lesson'].includes(kind ?? '')
  ) {
    return { message: 'Este conteúdo não está disponível.', saved: false };
  }
  const archivedAt = new Date();
  let archived: Array<{ id: string }>;
  if (kind === 'track')
    archived = await db
      .update(learningTracks)
      .set({ archivedAt })
      .where(and(eq(learningTracks.id, id), isNull(learningTracks.archivedAt)))
      .returning({ id: learningTracks.id });
  else if (kind === 'stage')
    archived = await db
      .update(learningStages)
      .set({ archivedAt })
      .where(and(eq(learningStages.id, id), isNull(learningStages.archivedAt)))
      .returning({ id: learningStages.id });
  else if (kind === 'module')
    archived = await db
      .update(learningModules)
      .set({ archivedAt })
      .where(and(eq(learningModules.id, id), isNull(learningModules.archivedAt)))
      .returning({ id: learningModules.id });
  else
    archived = await db
      .update(learningLessons)
      .set({ archivedAt })
      .where(and(eq(learningLessons.id, id), isNull(learningLessons.archivedAt)))
      .returning({ id: learningLessons.id });
  if (archived.length === 0) return { message: 'Este conteúdo não está disponível.', saved: false };
  revalidateSllContent();
  revalidatePath('/admin');
  return { message: 'O conteúdo foi arquivado e pode ser restaurado.', saved: true };
}

/** Restaura só o item escolhido; os níveis filhos continuam preservados como estavam. */
export async function restoreLearningNode(data: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const kind = stringField(data, 'kind');
  const id = stringField(data, 'nodeId');
  if (
    !id ||
    !uuidSchema.safeParse(id).success ||
    !['track', 'stage', 'module', 'lesson'].includes(kind ?? '')
  ) {
    return { message: 'Este conteúdo não está disponível.', saved: false };
  }
  let restored: Array<{ id: string }>;
  if (kind === 'track') {
    const row = await db.query.learningTracks.findFirst({
      columns: { position: true },
      where: and(eq(learningTracks.id, id), isNotNull(learningTracks.archivedAt)),
    });
    if (!row)
      return { message: 'Este conteúdo não está disponível para restauração.', saved: false };
    restored = await db
      .update(learningTracks)
      .set({ archivedAt: null, position: await nextPosition('track', null) })
      .where(eq(learningTracks.id, id))
      .returning({ id: learningTracks.id });
  } else if (kind === 'stage') {
    const row = await db.query.learningStages.findFirst({
      columns: { position: true, trackId: true },
      where: and(eq(learningStages.id, id), isNotNull(learningStages.archivedAt)),
    });
    if (!row)
      return { message: 'Este conteúdo não está disponível para restauração.', saved: false };
    restored = await db
      .update(learningStages)
      .set({ archivedAt: null, position: await nextPosition('stage', row.trackId) })
      .where(eq(learningStages.id, id))
      .returning({ id: learningStages.id });
  } else if (kind === 'module') {
    const row = await db.query.learningModules.findFirst({
      columns: { position: true, stageId: true },
      where: and(eq(learningModules.id, id), isNotNull(learningModules.archivedAt)),
    });
    if (!row)
      return { message: 'Este conteúdo não está disponível para restauração.', saved: false };
    restored = await db
      .update(learningModules)
      .set({ archivedAt: null, position: await nextPosition('module', row.stageId) })
      .where(eq(learningModules.id, id))
      .returning({ id: learningModules.id });
  } else {
    const row = await db.query.learningLessons.findFirst({
      columns: { position: true, moduleId: true },
      where: and(eq(learningLessons.id, id), isNotNull(learningLessons.archivedAt)),
    });
    if (!row)
      return { message: 'Este conteúdo não está disponível para restauração.', saved: false };
    restored = await db
      .update(learningLessons)
      .set({ archivedAt: null, position: await nextPosition('lesson', row.moduleId) })
      .where(eq(learningLessons.id, id))
      .returning({ id: learningLessons.id });
  }
  if (restored.length === 0)
    return { message: 'Este conteúdo não está disponível para restauração.', saved: false };
  revalidateSllContent();
  revalidatePath('/admin');
  return { message: 'O conteúdo foi restaurado.', saved: true };
}

/** Troca a posição com o item vizinho na mesma lista e no mesmo nível. */
export async function moveLearningNode(data: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const kind = stringField(data, 'kind');
  const id = stringField(data, 'nodeId');
  const direction = stringField(data, 'direction');
  const parentId = stringField(data, 'parentId');
  const trackKind = stringField(data, 'trackKind');
  if (
    !id ||
    !uuidSchema.safeParse(id).success ||
    !['track', 'stage', 'module', 'lesson'].includes(kind ?? '') ||
    !['up', 'down'].includes(direction ?? '')
  )
    return { message: 'Não consegui mudar a ordem deste conteúdo.', saved: false };
  const offset = direction === 'up' ? -1 : 1;

  await db.transaction(async (tx) => {
    if (kind === 'track') {
      const rows = await tx.query.learningTracks.findMany({
        columns: { id: true, position: true },
        where: and(
          isNull(learningTracks.archivedAt),
          trackKind && ['welcome', 'method', 'complementary_course'].includes(trackKind)
            ? eq(learningTracks.kind, trackKind as 'welcome' | 'method' | 'complementary_course')
            : undefined,
        ),
        orderBy: [asc(learningTracks.position), asc(learningTracks.id)],
      });
      const index = rows.findIndex((row) => row.id === id);
      const adjacent = rows[index + offset];
      if (!adjacent || index < 0) return;
      await tx
        .update(learningTracks)
        .set({ position: adjacent.position })
        .where(eq(learningTracks.id, id));
      await tx
        .update(learningTracks)
        .set({ position: rows[index]!.position })
        .where(eq(learningTracks.id, adjacent.id));
    } else if (kind === 'stage' && parentId) {
      const rows = await tx.query.learningStages.findMany({
        columns: { id: true, position: true },
        where: and(eq(learningStages.trackId, parentId), isNull(learningStages.archivedAt)),
        orderBy: [asc(learningStages.position), asc(learningStages.id)],
      });
      const index = rows.findIndex((row) => row.id === id);
      const adjacent = rows[index + offset];
      if (!adjacent || index < 0) return;
      await tx
        .update(learningStages)
        .set({ position: adjacent.position })
        .where(eq(learningStages.id, id));
      await tx
        .update(learningStages)
        .set({ position: rows[index]!.position })
        .where(eq(learningStages.id, adjacent.id));
    } else if (kind === 'module' && parentId) {
      const rows = await tx.query.learningModules.findMany({
        columns: { id: true, position: true },
        where: and(eq(learningModules.stageId, parentId), isNull(learningModules.archivedAt)),
        orderBy: [asc(learningModules.position), asc(learningModules.id)],
      });
      const index = rows.findIndex((row) => row.id === id);
      const adjacent = rows[index + offset];
      if (!adjacent || index < 0) return;
      await tx
        .update(learningModules)
        .set({ position: adjacent.position })
        .where(eq(learningModules.id, id));
      await tx
        .update(learningModules)
        .set({ position: rows[index]!.position })
        .where(eq(learningModules.id, adjacent.id));
    } else if (kind === 'lesson' && parentId) {
      const rows = await tx.query.learningLessons.findMany({
        columns: { id: true, position: true },
        where: and(eq(learningLessons.moduleId, parentId), isNull(learningLessons.archivedAt)),
        orderBy: [asc(learningLessons.position), asc(learningLessons.id)],
      });
      const index = rows.findIndex((row) => row.id === id);
      const adjacent = rows[index + offset];
      if (!adjacent || index < 0) return;
      await tx
        .update(learningLessons)
        .set({ position: adjacent.position })
        .where(eq(learningLessons.id, id));
      await tx
        .update(learningLessons)
        .set({ position: rows[index]!.position })
        .where(eq(learningLessons.id, adjacent.id));
    }
  });

  revalidateSllContent();
  revalidatePath('/admin');
  return { message: 'A ordem foi atualizada.', saved: true };
}

/** Recebe a ordem inteira: arrastar e soltar nunca pode mover um item para outro pai. */
export async function reorderLearningNodes(data: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const kind = stringField(data, 'kind');
  const parentId = stringField(data, 'parentId');
  const trackKind = stringField(data, 'trackKind');
  const ids = data.getAll('id');
  if (
    !['track', 'stage', 'module', 'lesson'].includes(kind ?? '') ||
    ids.length < 2 ||
    ids.length > 500 ||
    ids.some((id) => typeof id !== 'string' || !uuidSchema.safeParse(id).success) ||
    new Set(ids).size !== ids.length ||
    (kind !== 'track' && !uuidSchema.safeParse(parentId).success)
  )
    return { message: 'Não consegui mudar a ordem. Atualize a página.', saved: false };

  const orderedIds = ids as string[];
  const changed = await db.transaction(async (tx) => {
    const rows =
      kind === 'track'
        ? await tx.query.learningTracks.findMany({
            columns: { id: true },
            where: and(
              isNull(learningTracks.archivedAt),
              trackKind && ['welcome', 'method', 'complementary_course'].includes(trackKind)
                ? eq(
                    learningTracks.kind,
                    trackKind as 'welcome' | 'method' | 'complementary_course',
                  )
                : undefined,
            ),
          })
        : kind === 'stage'
          ? await tx.query.learningStages.findMany({
              columns: { id: true },
              where: and(eq(learningStages.trackId, parentId!), isNull(learningStages.archivedAt)),
            })
          : kind === 'module'
            ? await tx.query.learningModules.findMany({
                columns: { id: true },
                where: and(
                  eq(learningModules.stageId, parentId!),
                  isNull(learningModules.archivedAt),
                ),
              })
            : await tx.query.learningLessons.findMany({
                columns: { id: true },
                where: and(
                  eq(learningLessons.moduleId, parentId!),
                  isNull(learningLessons.archivedAt),
                ),
              });
    if (rows.length !== orderedIds.length || rows.some((row) => !orderedIds.includes(row.id)))
      return false;
    for (let position = 0; position < orderedIds.length; position++) {
      const id = orderedIds[position]!;
      if (kind === 'track')
        await tx.update(learningTracks).set({ position }).where(eq(learningTracks.id, id));
      else if (kind === 'stage')
        await tx.update(learningStages).set({ position }).where(eq(learningStages.id, id));
      else if (kind === 'module')
        await tx.update(learningModules).set({ position }).where(eq(learningModules.id, id));
      else await tx.update(learningLessons).set({ position }).where(eq(learningLessons.id, id));
    }
    return true;
  });
  if (!changed)
    return { message: 'A lista mudou. Atualize a página e tente de novo.', saved: false };
  revalidateSllContent();
  revalidatePath('/admin');
  revalidatePath('/sll');
  return { message: 'Nova ordem salva.', saved: true };
}

/** Publica um item só quando ele e o nível filho têm conteúdo pronto. */
export async function setLearningNodePublication(data: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const kind = stringField(data, 'kind');
  const id = stringField(data, 'nodeId');
  const nextStatus = stringField(data, 'status');
  if (
    !id ||
    !uuidSchema.safeParse(id).success ||
    !['track', 'stage', 'module', 'lesson'].includes(kind ?? '') ||
    !['draft', 'published'].includes(nextStatus ?? '')
  ) {
    return { message: 'Este conteúdo não está disponível.', saved: false };
  }

  const status = nextStatus as 'draft' | 'published';
  if (status === 'published') {
    let hasPublishedChild = true;
    if (kind === 'track') {
      hasPublishedChild = Boolean(
        await db.query.learningStages.findFirst({
          columns: { id: true },
          where: and(
            eq(learningStages.trackId, id),
            eq(learningStages.status, 'published'),
            isNull(learningStages.archivedAt),
          ),
        }),
      );
    } else if (kind === 'stage') {
      hasPublishedChild = Boolean(
        await db.query.learningModules.findFirst({
          columns: { id: true },
          where: and(
            eq(learningModules.stageId, id),
            eq(learningModules.status, 'published'),
            isNull(learningModules.archivedAt),
          ),
        }),
      );
    } else if (kind === 'module') {
      hasPublishedChild = Boolean(
        await db.query.learningLessons.findFirst({
          columns: { id: true },
          where: and(
            eq(learningLessons.moduleId, id),
            eq(learningLessons.status, 'published'),
            isNull(learningLessons.archivedAt),
          ),
        }),
      );
    }
    if (!hasPublishedChild) {
      const child = kind === 'track' ? 'etapa' : kind === 'stage' ? 'módulo' : 'aula';
      return {
        message: `Publique pelo menos um ${child} desta lista antes de publicar este nível.`,
        saved: false,
      };
    }
  }

  if (kind === 'lesson' && status === 'published') {
    const lesson = await db.query.learningLessons.findFirst({
      columns: { id: true, title: true, description: true, archivedAt: true },
      where: and(eq(learningLessons.id, id), isNull(learningLessons.archivedAt)),
      with: {
        blocks: {
          columns: { kind: true, data: true },
          orderBy: [asc(learningContentBlocks.position)],
        },
      },
    });
    if (!lesson) return { message: 'Esta aula não está disponível.', saved: false };
    const issue = lessonPublicationIssue(
      lesson.title,
      lesson.description,
      lesson.blocks.map((block) => ({
        kind: block.kind,
        data: block.data as Record<string, unknown>,
      })),
    );
    if (issue) return { message: issue, saved: false };
  }

  // Fora do ar, a edição vai direto para a versão principal. Um rascunho que sobrasse
  // continuaria na tela do admin e voltaria a valer na próxima publicação.
  if (status === 'draft' && (await getNodeDraft(kind as LearningNodeKind, id)))
    await applyNodeDraft(kind as LearningNodeKind, id, { validate: false });

  let updated: Array<{ id: string }>;
  if (kind === 'track') {
    updated = await db
      .update(learningTracks)
      .set({ status })
      .where(and(eq(learningTracks.id, id), isNull(learningTracks.archivedAt)))
      .returning({ id: learningTracks.id });
  } else if (kind === 'stage') {
    updated = await db
      .update(learningStages)
      .set({ status })
      .where(and(eq(learningStages.id, id), isNull(learningStages.archivedAt)))
      .returning({ id: learningStages.id });
  } else if (kind === 'module') {
    updated = await db
      .update(learningModules)
      .set({ status })
      .where(and(eq(learningModules.id, id), isNull(learningModules.archivedAt)))
      .returning({ id: learningModules.id });
  } else {
    updated = await db
      .update(learningLessons)
      .set({ status })
      .where(and(eq(learningLessons.id, id), isNull(learningLessons.archivedAt)))
      .returning({ id: learningLessons.id });
  }
  if (!updated.length) return { message: 'Este conteúdo não está disponível.', saved: false };
  revalidateSllContent();
  revalidatePath('/admin');
  revalidatePath('/admin/preview');
  return {
    message: status === 'published' ? 'Conteúdo publicado.' : 'Conteúdo voltou para rascunho.',
    saved: true,
  };
}

/** Escolhe o curso em destaque sem depender da posição na lista. */
export async function setFeaturedCourse(data: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const id = stringField(data, 'nodeId');
  if (!id || !uuidSchema.safeParse(id).success) return { message: 'Curso inválido.', saved: false };
  const course = await db.query.learningTracks.findFirst({
    columns: { id: true, featured: true },
    where: and(
      eq(learningTracks.id, id),
      eq(learningTracks.kind, 'complementary_course'),
      isNull(learningTracks.archivedAt),
    ),
  });
  if (!course) return { message: 'Curso não encontrado.', saved: false };
  await db.transaction(async (tx) => {
    await tx
      .update(learningTracks)
      .set({ featured: false })
      .where(eq(learningTracks.kind, 'complementary_course'));
    if (!course.featured)
      await tx.update(learningTracks).set({ featured: true }).where(eq(learningTracks.id, id));
  });
  revalidateSllContent();
  revalidatePath('/admin');
  revalidatePath('/sll/cursos');
  return {
    saved: true,
    message: course.featured ? 'Destaque removido.' : 'Curso definido como destaque.',
  };
}

/** Troca a versão visível somente depois de a administradora publicar o rascunho. */
export async function publishNodeDraft(data: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const kind = stringField(data, 'kind');
  const id = stringField(data, 'nodeId');
  if (
    !id ||
    !uuidSchema.safeParse(id).success ||
    !['track', 'stage', 'module', 'lesson'].includes(kind ?? '')
  )
    return { saved: false, message: 'Conteúdo inválido.' };
  const result = await applyNodeDraft(kind as LearningNodeKind, id, { validate: true });
  if (!result.saved) return result;
  revalidateSllContent();
  revalidatePath('/admin');
  revalidatePath('/sll');
  revalidatePath('/sll/cursos');
  revalidatePath(`/sll/aula/${id}`);
  return { saved: true, message: 'Alterações publicadas para as alunas.' };
}

/**
 * Passa o rascunho para a versão principal e apaga o rascunho. Ao publicar, confere as regras
 * da aula; ao despublicar, só junta as edições, já que as alunas deixam de ver o item.
 *
 * Tudo acontece numa transação com o rascunho travado e relido lá dentro: um salvamento que
 * chegue no meio espera, em vez de ser apagado junto com o rascunho publicado. Com `replacement`
 * (voltar à versão anterior), os dados vêm dela e nenhum rascunho é criado: se a conferência
 * falhar, nada fica para trás.
 */
async function applyNodeDraft(
  nodeKind: LearningNodeKind,
  id: string,
  { validate, replacement }: { validate: boolean; replacement?: LearningNodeDraftData },
): Promise<StructureActionState> {
  return withNodeDraftLock(nodeKind, id, async (tx) => {
    const draft = await getNodeDraftForUpdate(tx, nodeKind, id);
    if (replacement && draft)
      return {
        saved: false,
        message: 'Descarte ou publique o rascunho antes de voltar à versão anterior.',
      };
    const data = replacement ?? draft?.data;
    if (!data) return { saved: false, message: 'Não há alterações para publicar.' };
    if (nodeKind === 'lesson') {
      const lesson = await tx.query.learningLessons.findFirst({
        columns: {
          title: true,
          description: true,
          durationMinutes: true,
          countsTowardProgress: true,
          relatedLessonId: true,
        },
        where: and(eq(learningLessons.id, id), isNull(learningLessons.archivedAt)),
        with: { blocks: { orderBy: [asc(learningContentBlocks.position)] } },
      });
      if (!lesson) return { saved: false, message: 'Aula não encontrada.' };
      const blocks = data.blocks ?? lesson.blocks;
      const issue = lessonPublicationIssue(
        data.title ?? lesson.title,
        data.description === undefined ? lesson.description : data.description,
        blocks.map((block) => ({ kind: block.kind, data: block.data as Record<string, unknown> })),
      );
      if (validate && issue) return { saved: false, message: issue };
      const previous = {
        title: lesson.title,
        description: lesson.description,
        durationMinutes: lesson.durationMinutes,
        countsTowardProgress: lesson.countsTowardProgress,
        relatedLessonId: lesson.relatedLessonId,
        blocks: lesson.blocks.map((block) => ({
          id: block.id,
          kind: block.kind,
          data: block.data,
          position: block.position,
        })),
      };
      await tx
        .insert(learningNodeHistory)
        .values({ kind: nodeKind, nodeId: id, data: previous })
        .onConflictDoUpdate({
          target: [learningNodeHistory.kind, learningNodeHistory.nodeId],
          set: { data: previous },
        });
      await tx
        .update(learningLessons)
        .set({
          title: data.title ?? lesson.title,
          description: data.description === undefined ? lesson.description : data.description,
          ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
          ...(data.countsTowardProgress !== undefined
            ? { countsTowardProgress: data.countsTowardProgress }
            : {}),
          ...(data.relatedLessonId !== undefined ? { relatedLessonId: data.relatedLessonId } : {}),
        })
        .where(eq(learningLessons.id, id));
      if (data.blocks) {
        const liveIds = new Set(lesson.blocks.map((block) => block.id));
        const nextIds = new Set(data.blocks.map((block) => block.id));
        for (const block of data.blocks) {
          if (liveIds.has(block.id))
            await tx
              .update(learningContentBlocks)
              .set({ data: block.data, position: block.position })
              .where(
                and(eq(learningContentBlocks.id, block.id), eq(learningContentBlocks.lessonId, id)),
              );
          else
            await tx.insert(learningContentBlocks).values({
              id: block.id,
              lessonId: id,
              kind: block.kind,
              data: block.data,
              position: block.position,
            });
        }
        for (const block of lesson.blocks) {
          if (!nextIds.has(block.id))
            await tx.delete(learningContentBlocks).where(eq(learningContentBlocks.id, block.id));
        }
      }
    } else {
      // Item arquivado não recebe publicação: ele voltaria às alunas com outro conteúdo.
      const current =
        nodeKind === 'track'
          ? await tx.query.learningTracks.findFirst({
              columns: { title: true, description: true, coverStorageKey: true, coverAlt: true },
              where: and(eq(learningTracks.id, id), isNull(learningTracks.archivedAt)),
            })
          : nodeKind === 'stage'
            ? await tx.query.learningStages.findFirst({
                columns: { title: true, description: true },
                where: and(eq(learningStages.id, id), isNull(learningStages.archivedAt)),
              })
            : await tx.query.learningModules.findFirst({
                columns: { title: true, description: true },
                where: and(eq(learningModules.id, id), isNull(learningModules.archivedAt)),
              });
      if (!current) return { saved: false, message: 'Conteúdo não encontrado.' };
      const values = {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(nodeKind === 'track' && data.coverStorageKey !== undefined
          ? { coverStorageKey: data.coverStorageKey }
          : {}),
        ...(nodeKind === 'track' && data.coverAlt !== undefined ? { coverAlt: data.coverAlt } : {}),
      };
      await tx
        .insert(learningNodeHistory)
        .values({ kind: nodeKind, nodeId: id, data: current })
        .onConflictDoUpdate({
          target: [learningNodeHistory.kind, learningNodeHistory.nodeId],
          set: { data: current },
        });
      if (nodeKind === 'track')
        await tx.update(learningTracks).set(values).where(eq(learningTracks.id, id));
      else if (nodeKind === 'stage')
        await tx.update(learningStages).set(values).where(eq(learningStages.id, id));
      else await tx.update(learningModules).set(values).where(eq(learningModules.id, id));
    }
    if (draft)
      await tx
        .delete(learningNodeDrafts)
        .where(and(eq(learningNodeDrafts.kind, nodeKind), eq(learningNodeDrafts.nodeId, id)));
    return { saved: true, message: '' };
  });
}

/** Restaura a última versão publicada, guardando a atual como a nova versão anterior. */
export async function restorePreviousNodeVersion(data: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const kind = stringField(data, 'kind');
  const id = stringField(data, 'nodeId');
  if (
    !id ||
    !uuidSchema.safeParse(id).success ||
    !['track', 'stage', 'module', 'lesson'].includes(kind ?? '')
  )
    return { saved: false, message: 'Conteúdo inválido.' };
  const nodeKind = kind as LearningNodeKind;
  const previous = await db.query.learningNodeHistory.findFirst({
    where: and(eq(learningNodeHistory.kind, nodeKind), eq(learningNodeHistory.nodeId, id)),
  });
  if (!previous) return { saved: false, message: 'Não há versão anterior.' };
  const result = await applyNodeDraft(nodeKind, id, {
    validate: true,
    replacement: previous.data,
  });
  if (!result.saved) return result;
  revalidateSllContent();
  revalidatePath('/admin');
  revalidatePath('/sll');
  revalidatePath('/sll/cursos');
  revalidatePath(`/sll/aula/${id}`);
  return { saved: true, message: 'Versão anterior restaurada.' };
}

export async function discardNodeDraft(data: FormData): Promise<StructureActionState> {
  await requireAdmin();
  const kind = stringField(data, 'kind');
  const id = stringField(data, 'nodeId');
  if (
    !id ||
    !uuidSchema.safeParse(id).success ||
    !['track', 'stage', 'module', 'lesson'].includes(kind ?? '')
  )
    return { saved: false, message: 'Conteúdo inválido.' };
  const removed = await db
    .delete(learningNodeDrafts)
    .where(and(eq(learningNodeDrafts.kind, kind!), eq(learningNodeDrafts.nodeId, id)))
    .returning({ nodeId: learningNodeDrafts.nodeId });
  if (!removed.length) return { saved: false, message: 'Não há rascunho para descartar.' };
  revalidatePath('/admin');
  return { saved: true, message: 'Rascunho descartado. A versão publicada continua disponível.' };
}
