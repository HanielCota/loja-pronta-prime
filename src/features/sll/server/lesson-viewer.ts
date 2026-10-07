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
import { getSllTrackProgress } from './progress';
import { isSafeContentDestination } from '@/lib/urls';
import { resourceHref } from '../tools/catalog';

/** Entrega à aula só os materiais publicados e os dados visíveis para a aluna. */
export async function getSllLessonViewer(lessonId: string) {
  const { session, products } = await requireProduct('sll');
  if (!isProgressId(lessonId)) return null;

  const lesson = await db.query.learningLessons.findFirst({
    columns: {
      id: true,
      title: true,
      description: true,
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
        columns: { id: true, title: true, status: true, archivedAt: true },
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
            columns: { id: true, title: true, position: true, durationMinutes: true },
            where: and(eq(learningLessons.status, 'published'), isNull(learningLessons.archivedAt)),
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
  const stageLessons = stage.modules.flatMap((item) => item.lessons);
  const progressByLesson = new Map(stageLessons.map((item) => [item.id, item]));
  const currentProgress = progressByLesson.get(lesson.id);

  const currentIndex = lesson.module.lessons.findIndex((item) => item.id === lesson.id);
  if (currentIndex < 0) return null;

  // Etapa fechada: nem procura as ferramentas da aula (a tela só mostra o aviso de bloqueio).
  const linkedResources = !stage.access.isUnlocked
    ? []
    : await db
        .select({
          id: learningResources.id,
          slug: learningResources.slug,
          title: learningResources.title,
          buttonLabel: learningResources.buttonLabel,
          destination: learningResources.destination,
        })
        .from(learningResourceLessons)
        .innerJoin(learningResources, eq(learningResourceLessons.resourceId, learningResources.id))
        .where(
          and(
            eq(learningResourceLessons.lessonId, lesson.id),
            eq(learningResources.status, 'published'),
            isNull(learningResources.archivedAt),
          ),
        );

  return {
    user: session.user,
    hasChoice: products.length > 1,
    track: { id: track.id, slug: track.slug, title: track.title, kind: track.kind },
    progress: { completedCount: track.completedCount, totalCount: track.totalCount },
    stage: { id: stage.id, title: stage.title, access: stage.access },
    module: { id: lesson.module.id, title: lesson.module.title },
    lesson: {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      durationMinutes: lesson.durationMinutes,
      completed:
        currentProgress?.completedAt !== null && currentProgress?.completedAt !== undefined,
      previousId: lesson.module.lessons[currentIndex - 1]?.id ?? null,
      nextId: lesson.module.lessons[currentIndex + 1]?.id ?? null,
      number: currentIndex + 1,
      total: lesson.module.lessons.length,
    },
    lessons: lesson.module.lessons.map((item, index) => {
      const progress = progressByLesson.get(item.id);
      return {
        id: item.id,
        title: item.title,
        number: index + 1,
        durationMinutes: item.durationMinutes,
        completed: progress?.completedAt !== null && progress?.completedAt !== undefined,
        current: item.id === lesson.id,
      };
    }),
    // Etapa fechada não manda o conteúdo pro navegador: a tela só mostra o aviso.
    blocks: (stage.access.isUnlocked ? lesson.blocks : []).map((block) => ({
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
