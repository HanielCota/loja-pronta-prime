import { DATABASE_CACHE_SCOPE } from '@/server/cache-context';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningContentBlocks,
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';
import { SLL_CONTENT_SECONDS, SLL_CONTENT_TAG } from './content-cache';

// Só conteúdo publicado, sem sessão, progresso ou decisões de acesso. A guarda fica no chamador.
export const getPublishedSllTrack = cache(
  unstable_cache(
    async (trackId: string) => {
      return db.query.learningTracks.findFirst({
        columns: {
          id: true,
          kind: true,
          slug: true,
          title: true,
          description: true,
          coverStorageKey: true,
          coverAlt: true,
          featured: true,
        },
        where: and(
          eq(learningTracks.id, trackId),
          eq(learningTracks.status, 'published'),
          isNull(learningTracks.archivedAt),
        ),
        with: {
          stages: {
            columns: { id: true, slug: true, title: true, description: true, position: true },
            where: and(eq(learningStages.status, 'published'), isNull(learningStages.archivedAt)),
            orderBy: [asc(learningStages.position), asc(learningStages.id)],
            with: {
              modules: {
                columns: { id: true, slug: true, title: true, position: true },
                where: and(
                  eq(learningModules.status, 'published'),
                  isNull(learningModules.archivedAt),
                ),
                orderBy: [asc(learningModules.position), asc(learningModules.id)],
                with: {
                  lessons: {
                    columns: {
                      id: true,
                      slug: true,
                      title: true,
                      relatedLessonId: true,
                      description: true,
                      position: true,
                      durationMinutes: true,
                      countsTowardProgress: true,
                    },
                    where: and(
                      eq(learningLessons.status, 'published'),
                      isNull(learningLessons.archivedAt),
                    ),
                    orderBy: [asc(learningLessons.position), asc(learningLessons.id)],
                    with: {
                      blocks: {
                        columns: { kind: true, data: true },
                        // A lista só precisa identificar materiais; texto e vídeo ficam na aula.
                        where: inArray(learningContentBlocks.kind, ['file', 'link', 'image']),
                        orderBy: [
                          asc(learningContentBlocks.position),
                          asc(learningContentBlocks.id),
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    },
    ['sll-published-track', DATABASE_CACHE_SCOPE],
    { revalidate: SLL_CONTENT_SECONDS, tags: [SLL_CONTENT_TAG] },
  ),
);
