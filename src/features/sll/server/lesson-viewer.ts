import { DATABASE_CACHE_SCOPE } from '@/server/cache-context';
import { unstable_cache } from 'next/cache';
import { SLL_CONTENT_SECONDS, SLL_CONTENT_TAG } from './content-cache';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { requireProduct } from '@/features/products/server/access';
import { contentPreviewData } from '@/features/admin/content-preview';
import { db } from '@/server/db';
import {
  learningContentBlocks,
  learningLessons,
  learningResourceLessons,
  learningResources,
} from '@/server/db/schema';
import { isProgressId } from '../progress-rules';
import { getAdjacentSllLessons } from '../lesson-navigation';
import { getSllExpectedMaterial } from '../material-catalog';
import { getSllTrackProgress } from './progress';
import { isSafeContentDestination } from '@/lib/urls';
import { resourceHref } from '../tools/catalog';
import { isPlanReferenceAvailable } from '../lesson-access';

// A leitura comum fica em cache; publicação e acesso da aluna são conferidos abaixo.
const readPublishedLesson = unstable_cache(
  async (lessonId: string) => {
    return db.query.learningLessons.findFirst({
      columns: {
        id: true,
        title: true,
        description: true,
        sourceNumber: true,
        durationMinutes: true,
        status: true,
      },
      where: and(
        eq(learningLessons.id, lessonId),
        eq(learningLessons.status, 'published'),
        isNull(learningLessons.archivedAt),
      ),
      with: {
        module: {
          columns: { id: true, title: true, position: true, status: true, archivedAt: true },
          with: {
            stage: {
              columns: { id: true, title: true, status: true, archivedAt: true },
              with: {
                track: {
                  columns: { id: true, kind: true, title: true, status: true, archivedAt: true },
                },
              },
            },
            lessons: {
              columns: {
                id: true,
                title: true,
                position: true,
                durationMinutes: true,
                sourceNumber: true,
              },
              where: and(
                eq(learningLessons.status, 'published'),
                isNull(learningLessons.archivedAt),
              ),
              orderBy: [asc(learningLessons.position), asc(learningLessons.id)],
            },
          },
        },
        blocks: {
          columns: { id: true, kind: true, data: true },
          orderBy: [asc(learningContentBlocks.position), asc(learningContentBlocks.id)],
        },
      },
    });
  },
  ['sll-published-lesson', DATABASE_CACHE_SCOPE],
  { revalidate: SLL_CONTENT_SECONDS, tags: [SLL_CONTENT_TAG] },
);

// Os links publicados são comuns; só a aula desbloqueada chega a chamar esta leitura.
const readLessonResources = unstable_cache(
  async (lessonId: string) => {
    return db
      .select({
        id: learningResources.id,
        slug: learningResources.slug,
        title: learningResources.title,
        description: learningResources.description,
        buttonLabel: learningResources.buttonLabel,
        destination: learningResources.destination,
      })
      .from(learningResourceLessons)
      .innerJoin(learningResources, eq(learningResourceLessons.resourceId, learningResources.id))
      .where(
        and(
          eq(learningResourceLessons.lessonId, lessonId),
          eq(learningResources.status, 'published'),
          isNull(learningResources.archivedAt),
        ),
      );
  },
  ['sll-lesson-resources', DATABASE_CACHE_SCOPE],
  { revalidate: SLL_CONTENT_SECONDS, tags: [SLL_CONTENT_TAG] },
);

/** Entrega à aula só os materiais publicados e os dados visíveis para a aluna. */
export async function getSllLessonViewer(lessonId: string) {
  const { session, products } = await requireProduct(
    'sll',
    `/sll/aula/${encodeURIComponent(lessonId)}`,
  );
  if (!isProgressId(lessonId)) return null;

  const lesson = await readPublishedLesson(lessonId);
  if (
    !lesson ||
    lesson.module.status !== 'published' ||
    lesson.module.archivedAt !== null ||
    lesson.module.stage.status !== 'published' ||
    lesson.module.stage.archivedAt !== null ||
    lesson.module.stage.track.status !== 'published' ||
    lesson.module.stage.track.archivedAt !== null
  )
    return null;

  const track = await getSllTrackProgress(lesson.module.stage.track.id);
  const stage = track?.stages.find((item) => item.id === lesson.module.stage.id);
  if (!track || !stage || !stage.access) return null;
  const planStages = track.stages.map((item) => ({
    slug: item.slug,
    isUnlocked: item.access?.isUnlocked ?? false,
    relatedLessonIds: item.modules.flatMap((module) =>
      module.lessons.map((sourceLesson) => sourceLesson.relatedLessonId),
    ),
  }));
  const isUnlocked =
    stage.access.isUnlocked ||
    (track.kind === 'method' && isPlanReferenceAvailable(planStages, lesson.id));
  const referenceOnly = isUnlocked && !stage.access.isUnlocked;
  const stageLessons = stage.modules.flatMap((item) => item.lessons);
  const progressByLesson = new Map(stageLessons.map((item) => [item.id, item]));
  const currentProgress = progressByLesson.get(lesson.id);

  const orderedStageLessons = stage.modules.flatMap((item) =>
    item.lessons.map((stageLesson) => ({
      id: stageLesson.id,
      moduleId: item.id,
      moduleTitle: item.title,
    })),
  );
  // Uma aula de apoio não oferece navegação para aulas que continuam fechadas.
  const adjacent = getAdjacentSllLessons(
    referenceOnly
      ? orderedStageLessons.filter((item) => isPlanReferenceAvailable(planStages, item.id))
      : orderedStageLessons,
    lesson.id,
  );

  const moduleLessons = referenceOnly
    ? lesson.module.lessons.filter((item) => isPlanReferenceAvailable(planStages, item.id))
    : lesson.module.lessons;
  const currentIndex = moduleLessons.findIndex((item) => item.id === lesson.id);
  if (currentIndex < 0) return null;

  // Etapa fechada: nem procura as ferramentas da aula (a tela só mostra o aviso de bloqueio).
  const linkedResources = !isUnlocked ? [] : await readLessonResources(lesson.id);

  return {
    user: session.user,
    hasChoice: products.length > 1,
    track: { id: track.id, slug: track.slug, title: track.title, kind: track.kind },
    progress: { completedCount: track.completedCount, totalCount: track.totalCount },
    stage: {
      id: stage.id,
      title: stage.title,
      access: {
        ...stage.access,
        isUnlocked,
        lockMessage: isUnlocked ? null : stage.access.lockMessage,
      },
    },
    module: {
      id: lesson.module.id,
      title: lesson.module.title,
      number: stage.modules.findIndex((item) => item.id === lesson.module.id) + 1,
    },
    lesson: {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      sourceNumber: lesson.sourceNumber,
      unavailableMaterial: lesson.blocks.some((block) => block.kind === 'file')
        ? null
        : getSllExpectedMaterial(lesson.sourceNumber),
      durationMinutes: lesson.durationMinutes,
      completed:
        currentProgress?.completedAt !== null && currentProgress?.completedAt !== undefined,
      previousId: adjacent.previous?.id ?? null,
      previousModuleId: adjacent.previous?.moduleId ?? null,
      nextId: adjacent.next?.id ?? null,
      nextModuleId: adjacent.next?.moduleId ?? null,
      number: currentIndex + 1,
      total: moduleLessons.length,
    },
    lessons: moduleLessons.map((item, index) => {
      const progress = progressByLesson.get(item.id);
      return {
        id: item.id,
        title: item.title,
        number: index + 1,
        sourceNumber: item.sourceNumber,
        durationMinutes: item.durationMinutes,
        completed: progress?.completedAt !== null && progress?.completedAt !== undefined,
        current: item.id === lesson.id,
      };
    }),
    // Etapa fechada não manda o conteúdo pro navegador: a tela só mostra o aviso.
    blocks: (isUnlocked ? lesson.blocks : []).map((block) => ({
      id: block.id,
      kind: block.kind,
      data: contentPreviewData(block.kind, block.data),
    })),
    resources: linkedResources.map((resource) => ({
      ...resource,
      destination:
        resource.destination && isSafeContentDestination(resource.destination)
          ? resourceHref(resource)
          : null,
    })),
  };
}
