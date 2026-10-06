import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningContentBlocks,
  learningNodeDrafts,
  type LearningDraftBlock,
  type LearningNodeDraftData,
} from '@/server/db/schema';
import type { LearningNodeKind } from '../structure-types';

export type DraftKind = LearningNodeKind | 'resource' | 'banner';
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | DbTransaction;

/** Chamadores verificam a permissão de admin antes de acessar rascunhos. */
export async function getNodeDraft(kind: DraftKind, nodeId: string, executor: Executor = db) {
  return executor.query.learningNodeDrafts.findFirst({
    where: and(eq(learningNodeDrafts.kind, kind), eq(learningNodeDrafts.nodeId, nodeId)),
  });
}

/**
 * Lê o rascunho travando a linha até o fim da transação: uma gravação que chegue no meio espera,
 * em vez de ser apagada junto com o rascunho que está sendo publicado.
 */
export async function getNodeDraftForUpdate(tx: DbTransaction, kind: DraftKind, nodeId: string) {
  const [draft] = await tx
    .select()
    .from(learningNodeDrafts)
    .where(and(eq(learningNodeDrafts.kind, kind), eq(learningNodeDrafts.nodeId, nodeId)))
    .for('update');
  return draft;
}

/**
 * Abre uma transação com o rascunho do item travado até o fim. Quem lê o rascunho, demora (um
 * envio ao bucket, uma conferência) e depois grava precisa reler aqui dentro: sem a trava, duas
 * abas salvando ao mesmo tempo apagariam o trabalho uma da outra. A trava vale mesmo quando o
 * rascunho ainda não existe, o que um `for update` na linha não cobriria.
 */
export async function withNodeDraftLock<T>(
  kind: DraftKind,
  nodeId: string,
  run: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`node-draft:${kind}:${nodeId}`}))`,
    );
    return run(tx);
  });
}

/**
 * Junta o pedaço novo ao rascunho numa única gravação no banco (`||` do jsonb), sem ler antes:
 * duas gravações seguidas nunca apagam os campos uma da outra. Dentro de `withNodeDraftLock`,
 * passe a transação para gravar junto com o resto.
 */
export async function saveNodeDraft(
  kind: DraftKind,
  nodeId: string,
  patch: LearningNodeDraftData,
  executor: Executor = db,
) {
  const [saved] = await executor
    .insert(learningNodeDrafts)
    .values({ kind, nodeId, data: patch })
    .onConflictDoUpdate({
      target: [learningNodeDrafts.kind, learningNodeDrafts.nodeId],
      set: { data: sql`${learningNodeDrafts.data} || excluded.data`, updatedAt: new Date() },
    })
    .returning({ data: learningNodeDrafts.data });
  return saved?.data ?? patch;
}

/** Com a transação de `withNodeDraftLock`, lê o rascunho já travado para gravar em seguida. */
export async function getEditableLessonBlocks(
  lessonId: string,
  tx?: DbTransaction,
): Promise<LearningDraftBlock[]> {
  const executor = tx ?? db;
  const current = tx
    ? await getNodeDraftForUpdate(tx, 'lesson', lessonId)
    : await getNodeDraft('lesson', lessonId);
  if (current?.data.blocks) return current.data.blocks;
  const blocks = await executor.query.learningContentBlocks.findMany({
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
