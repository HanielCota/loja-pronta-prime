'use server';

import { runAsStudent } from '@/features/support/server/impersonation';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireProductAction } from '@/features/products/server/access';
import { isProgressId } from '@/features/sll/progress-rules';
import { db } from '@/server/db';
import { learningLessonProgress, learningTrackProgress } from '@/server/db/schema';
import { getZeCourse } from './catalog';
import { zeLessonVideo } from '../course';

export async function setZeLessonCompletion(form: FormData): Promise<void> {
  return runAsStudent('setZeLessonCompletion', async () => {
    const { userId } = await requireProductAction('sll', 'ze');
    const lessonId = form.get('lessonId');
    const completed = form.get('completed');
    if (!isProgressId(lessonId) || (completed !== 'true' && completed !== 'false'))
      redirect('/ze-mauro?resultado=invalid');
    const { course, preview } = await getZeCourse();
    if (preview) redirect('/ze-mauro');
    const lesson = course?.stages
      .flatMap((stage) => stage.modules.flatMap((module) => module.lessons))
      .find((item) => item.id === lessonId);
    if (!course || !lesson || !zeLessonVideo(lesson.blocks))
      redirect('/ze-mauro?resultado=invalid');
    const now = new Date();
    await db.transaction(async (tx) => {
      if (completed === 'true') {
        await tx
          .insert(learningLessonProgress)
          .values({ userId, lessonId, completedAt: now, lastViewedAt: now })
          .onConflictDoUpdate({
            target: [learningLessonProgress.userId, learningLessonProgress.lessonId],
            set: { completedAt: now, lastViewedAt: now, updatedAt: now },
          });
      } else {
        await tx
          .update(learningLessonProgress)
          .set({ completedAt: null, updatedAt: now })
          .where(
            and(
              eq(learningLessonProgress.userId, userId),
              eq(learningLessonProgress.lessonId, lessonId),
            ),
          );
      }
      await tx
        .insert(learningTrackProgress)
        .values({ userId, trackId: course.id, currentLessonId: lessonId, lastAccessedAt: now })
        .onConflictDoUpdate({
          target: [learningTrackProgress.userId, learningTrackProgress.trackId],
          set: { currentLessonId: lessonId, lastAccessedAt: now, updatedAt: now },
        });
    });
    revalidatePath('/ze-mauro');
    revalidatePath(`/ze-mauro/aula/${lessonId}`);
    redirect(`/ze-mauro/aula/${lessonId}?resultado=saved`);
  });
}
