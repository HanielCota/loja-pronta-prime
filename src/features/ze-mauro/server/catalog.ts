import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { DATABASE_CACHE_SCOPE } from '@/server/cache-context';
import { SLL_CONTENT_SECONDS, SLL_CONTENT_TAG } from '@/features/sll/server/content-cache';
import { isProgressId } from '@/features/sll/progress-rules';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { requireProduct, requireStudent } from '@/features/products/server/access';
import { hasAdminRole } from '@/features/admin/access';
import { getStudentExperience } from '@/features/sll/server/experience';
import { db } from '@/server/db';
import {
  learningTracks,
  learningStages,
  learningModules,
  learningLessons,
  learningContentBlocks,
  learningLessonProgress,
} from '@/server/db/schema';
import { ZE_COURSE_PATH, ZE_COURSE_SLUG } from '../course';

const cacheOptions = { revalidate: SLL_CONTENT_SECONDS, tags: [SLL_CONTENT_TAG] };

// Shared cache contains only published navigation and video availability, never account data.
const readPublishedCourse = unstable_cache(
  async () => {
    return db.query.learningTracks.findFirst({
      where: and(
        eq(learningTracks.slug, ZE_COURSE_SLUG),
        eq(learningTracks.expert, 'ze'),
        eq(learningTracks.status, 'published'),
        isNull(learningTracks.archivedAt),
      ),
      with: {
        stages: {
          where: and(eq(learningStages.status, 'published'), isNull(learningStages.archivedAt)),
          orderBy: [asc(learningStages.position), asc(learningStages.id)],
          with: {
            modules: {
              where: and(
                eq(learningModules.status, 'published'),
                isNull(learningModules.archivedAt),
              ),
              orderBy: [asc(learningModules.position), asc(learningModules.id)],
              with: {
                lessons: {
                  where: and(
                    eq(learningLessons.status, 'published'),
                    isNull(learningLessons.archivedAt),
                  ),
                  orderBy: [asc(learningLessons.position), asc(learningLessons.id)],
                  with: {
                    blocks: {
                      columns: { kind: true, data: true },
                      where: eq(learningContentBlocks.kind, 'video'),
                      orderBy: [asc(learningContentBlocks.position), asc(learningContentBlocks.id)],
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
  ['ze-published-course', DATABASE_CACHE_SCOPE],
  cacheOptions,
);

const readLessonBlocks = unstable_cache(
  async (lessonId: string) =>
    db.query.learningContentBlocks.findMany({
      columns: { id: true, kind: true, data: true },
      where: eq(learningContentBlocks.lessonId, lessonId),
      orderBy: [asc(learningContentBlocks.position), asc(learningContentBlocks.id)],
    }),
  ['ze-published-lesson-blocks', DATABASE_CACHE_SCOPE],
  cacheOptions,
);

/** Authorization and private progress are resolved separately from the content hierarchy. */
export const getZeCourse = cache(async (path: string = ZE_COURSE_PATH) => {
  const account = await requireStudent(path);
  const preview = hasAdminRole(account.session.user.role);
  // Administrators already manage this content; previewing it must not grant student access.
  const student = preview ? account : await requireProduct('sll', path, 'ze');
  const course = await readPublishedCourse();
  const lessonIds =
    course?.stages.flatMap((stage) =>
      stage.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
    ) ?? [];
  const [progress, experience] = await Promise.all([
    !preview && lessonIds.length
      ? db
          .select({
            lessonId: learningLessonProgress.lessonId,
            completedAt: learningLessonProgress.completedAt,
          })
          .from(learningLessonProgress)
          .where(
            and(
              eq(learningLessonProgress.userId, student.session.user.id),
              inArray(learningLessonProgress.lessonId, lessonIds),
            ),
          )
      : Promise.resolve([]),
    getStudentExperience(student.session.user.id),
  ]);
  return {
    ...student,
    course,
    preview,
    hasPri: student.products.includes('sll') && experience.allowed.includes('pri'),
    completed: new Set(progress.filter((item) => item.completedAt).map((item) => item.lessonId)),
  };
});

/** Verify current access and published ancestry before loading one lesson's full content. */
export async function getZeLesson(lessonId: string) {
  const data = await getZeCourse(`/ze-mauro/aula/${lessonId}`);
  const published = isProgressId(lessonId)
    ? data.course?.stages
        .flatMap((stage) => stage.modules.flatMap((module) => module.lessons))
        .find((lesson) => lesson.id === lessonId)
    : undefined;
  const lesson = published ? { ...published, blocks: await readLessonBlocks(lessonId) } : null;
  return { ...data, lesson };
}
