import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningContentBlocks,
  learningNodeDrafts,
  type LearningDraftBlock,
  type LearningNodeDraftData,
} from '@/server/db/schema';
import type { LearningNodeKind } from '../structure-types';

type DraftKind = LearningNodeKind | 'resource' | 'banner';

/** Chamadores verificam a permissão de admin antes de acessar rascunhos. */
export async function getNodeDraft(kind: DraftKind, nodeId: string) {
  return db.query.learningNodeDrafts.findFirst({
    where: and(eq(learningNodeDrafts.kind, kind), eq(learningNodeDrafts.nodeId, nodeId)),
  });
}

export async function saveNodeDraft(kind: DraftKind, nodeId: string, patch: LearningNodeDraftData) {
  const current = await getNodeDraft(kind, nodeId);
  const data = { ...current?.data, ...patch };
  await db
    .insert(learningNodeDrafts)
    .values({ kind, nodeId, data })
    .onConflictDoUpdate({
      target: [learningNodeDrafts.kind, learningNodeDrafts.nodeId],
      set: { data },
    });
  return data;
}

export async function getEditableLessonBlocks(lessonId: string): Promise<LearningDraftBlock[]> {
  const current = await getNodeDraft('lesson', lessonId);
  if (current?.data.blocks) return current.data.blocks;
  const blocks = await db.query.learningContentBlocks.findMany({
    columns: { id: true, kind: true, data: true, position: true },
    where: eq(learningContentBlocks.lessonId, lessonId),
    orderBy: [asc(learningContentBlocks.position), asc(learningContentBlocks.id)],
  });
  return blocks.map((block) => ({
    id: block.id,
    kind: block.kind,
    data: block.data,
    position: block.position,
  }));
}
