import { cache } from 'react';
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

/** Authorization and private progress are resolved separately from the content hierarchy. */
export const getZeCourse = cache(async (path: string = ZE_COURSE_PATH) => {
  const account = await requireStudent(path);
  const preview = hasAdminRole(account.session.user.role);
  // Administrators already manage this content; previewing it must not grant student access.
  const student = preview ? account : await requireProduct('sll', path, 'ze');
  const course = await db.query.learningTracks.findFirst({
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
            where: and(eq(learningModules.status, 'published'), isNull(learningModules.archivedAt)),
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
