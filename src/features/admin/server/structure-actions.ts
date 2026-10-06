'use server';

import { and, asc, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import {
  learningContentBlocks,
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';
import { requireAdmin } from './access';
import { learningSlugFromTitle } from '../structure-rules';
import { lessonPublicationIssue } from '../publication-rules';

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
    return { message: title.error.issues[0]?.message ?? 'Confira o nome.', saved: false };
  if (!description.success) {
    return {
      message: description.error.issues[0]?.message ?? 'Confira a descrição.',
      saved: false,
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
    return { message: 'A duração deve ser um número entre 1 e 999 minutos.', saved: false };
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
        where: isNull(learningTracks.archivedAt),
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

  revalidatePath('/admin');
  return { message: 'A ordem foi atualizada.', saved: true };
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
  revalidatePath('/admin');
  revalidatePath('/admin/preview');
  return {
    message: status === 'published' ? 'Conteúdo publicado.' : 'Conteúdo voltou para rascunho.',
    saved: true,
  };
}
