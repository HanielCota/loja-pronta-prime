import { DATABASE_CACHE_SCOPE } from '@/server/cache-context';
import { unstable_cache } from 'next/cache';
import { SLL_CONTENT_SECONDS, SLL_CONTENT_TAG } from '@/features/sll/server/content-cache';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/server/db';
import { learningContentBlocks, learningLessons } from '@/server/db/schema';
import { requireProduct } from '@/features/products/server/access';
import {
  getLessonLockMessageForTrack,
  getTrackStageAccess,
} from '@/features/sll/server/stage-lock';
import { ORIGINAL_MATERIALS } from '../catalog';

// A leitura comum fica em cache; publicação e acesso da aluna são conferidos abaixo.
const readLessonMaterials = unstable_cache(
  async () => {
    return db.query.learningLessons.findMany({
      columns: { id: true, slug: true, title: true },
      where: and(eq(learningLessons.status, 'published'), isNull(learningLessons.archivedAt)),
      orderBy: [asc(learningLessons.position), asc(learningLessons.id)],
      with: {
        blocks: {
          columns: { id: true, data: true },
          where: eq(learningContentBlocks.kind, 'file'),
          orderBy: [asc(learningContentBlocks.position)],
        },
        module: {
          columns: { status: true, archivedAt: true },
          with: {
            stage: {
              columns: { id: true, slug: true, status: true, archivedAt: true },
              with: {
                track: { columns: { id: true, slug: true, status: true, archivedAt: true } },
              },
            },
          },
        },
      },
    });
  },
  ['sll-material-catalog', DATABASE_CACHE_SCOPE],
  { revalidate: SLL_CONTENT_SECONDS, tags: [SLL_CONTENT_TAG] },
);

/** A lista respeita a publicação e o mesmo desbloqueio da aula e da rota de download. */
export async function getLessonMaterials() {
  const { session } = await requireProduct('sll');
  const lessons = await readLessonMaterials();
  const published = lessons.filter((lesson) =>
    [lesson.module, lesson.module.stage, lesson.module.stage.track].every(
      (node) => node.status === 'published' && node.archivedAt === null,
    ),
  );
  const trackIds = [
    ...new Set(
      published
        .filter(
          (lesson) =>
            lesson.blocks.length ||
            ORIGINAL_MATERIALS.some((item) => item.lessonSlug === lesson.slug),
        )
        .map((lesson) => lesson.module.stage.track.id),
    ),
  ];
  const tracks = new Map(
    await Promise.all(
      trackIds.map(async (id) => [id, await getTrackStageAccess(session.user.id, id)] as const),
    ),
  );
  const materials = await Promise.all(
    published.map(async (lesson) => {
      const lockMessage = await getLessonLockMessageForTrack(
        session.user.id,
        tracks.get(lesson.module.stage.track.id) ?? null,
        lesson.module.stage.id,
        lesson.id,
      );
      const files = lesson.blocks.flatMap((block) => {
        // jsonb NOT NULL ainda aceita o valor JSON null: sem a guarda, ler data.fileName derrubaria
        // a página inteira de materiais por causa de um bloco só.
        const data = block.data as Record<string, unknown> | null;
        if (
          !data ||
          typeof data.fileName !== 'string' ||
          !data.fileName.trim() ||
          typeof data.storageKey !== 'string'
        )
          return [];
        return [
          {
            id: block.id,
            title: data.fileName,
            // "arquivo." mostrava tipo vazio e um nome sem extensão aparecia inteiro em maiúsculas.
            type: /\.([a-z0-9]{1,8})$/i.exec(data.fileName)?.[1]?.toUpperCase() ?? 'Arquivo',
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lockMessage,
            destination: lockMessage ? null : `/api/sll/material/${block.id}`,
            pending: false,
          },
        ];
      });
      const original =
        lesson.module.stage.track.slug === 'metodo-sll' && lesson.module.stage.slug === 'etapa-3'
          ? ORIGINAL_MATERIALS.find((item) => item.lessonSlug === lesson.slug)
          : undefined;
      if (original && !files.length)
        files.push({
          id: `pending-${lesson.id}`,
          title: original.title,
          type: original.type,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lockMessage,
          destination: null,
          pending: true,
        });
      return files;
    }),
  );
  return materials.flat();
}
