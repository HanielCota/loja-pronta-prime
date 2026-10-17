import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  assistantPlaybooks,
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';
import { starterPlaybooks, type Strategy } from '../model';

const lessonSlugs: Record<Strategy, string[]> = {
  organic: [
    'credenciamento-shopee-vinculacao-escala-shop',
    'informacoes-gerenciais',
    'titulos-descricao-precificacao',
    'videos-shopee-videos',
    'videos-shopee-videos',
    'videos-shopee-videos',
    'informacoes-gerenciais',
  ],
  hybrid: [
    'credenciamento-shopee-vinculacao-escala-shop',
    'informacoes-gerenciais',
    'titulos-descricao-precificacao',
    'videos-shopee-videos',
    'introducao-ao-shopee-ads',
    'introducao-ao-shopee-ads',
    'informacoes-gerenciais',
  ],
  paid: [
    'credenciamento-shopee-vinculacao-escala-shop',
    'informacoes-gerenciais',
    'titulos-descricao-precificacao',
    'videos-shopee-videos',
    'introducao-ao-shopee-ads',
    'introducao-ao-shopee-ads',
    'informacoes-gerenciais',
  ],
};

/** Roteiros iniciais autorizados pelo dono; sem atribuir uma aprovação pessoal aos experts. */
export async function ensureInitialAssistantPlaybooks() {
  await db.transaction(async (tx) => {
    const lessons = await tx
      .select({ id: learningLessons.id, slug: learningLessons.slug })
      .from(learningLessons)
      .innerJoin(learningModules, eq(learningModules.id, learningLessons.moduleId))
      .innerJoin(learningStages, eq(learningStages.id, learningModules.stageId))
      .innerJoin(learningTracks, eq(learningTracks.id, learningStages.trackId))
      .where(
        and(
          eq(learningLessons.status, 'published'),
          eq(learningModules.status, 'published'),
          eq(learningStages.status, 'published'),
          eq(learningTracks.status, 'published'),
          isNull(learningLessons.archivedAt),
          isNull(learningModules.archivedAt),
          isNull(learningStages.archivedAt),
          isNull(learningTracks.archivedAt),
        ),
      );
    for (const book of starterPlaybooks()) {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`assistant-playbook:${book.strategy}`}))`,
      );
      const [published] = await tx
        .select({ id: assistantPlaybooks.id })
        .from(assistantPlaybooks)
        .where(
          and(
            eq(assistantPlaybooks.strategy, book.strategy),
            isNull(assistantPlaybooks.archivedAt),
            sql`${assistantPlaybooks.publishedAt} is not null`,
          ),
        )
        .limit(1);
      if (published) continue;
      const [last] = await tx
        .select({ revision: assistantPlaybooks.revision })
        .from(assistantPlaybooks)
        .where(eq(assistantPlaybooks.strategy, book.strategy))
        .orderBy(desc(assistantPlaybooks.revision))
        .limit(1);
      await tx.insert(assistantPlaybooks).values({
        ...book,
        revision: (last?.revision ?? 0) + 1,
        publishedAt: new Date(),
        actions: book.actions.map((action, index) => ({
          ...action,
          lessonId:
            lessons.find((lesson) => lesson.slug === lessonSlugs[book.strategy][index])?.id ?? null,
        })),
      });
    }
  });
}
