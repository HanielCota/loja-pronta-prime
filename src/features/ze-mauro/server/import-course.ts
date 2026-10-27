import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import {
  learningContentBlocks,
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';
import {
  initialZeCourse,
  validateZeCourse,
  ZE_PENDING_DESCRIPTION,
  type ZeCourseInventory,
} from '../course';

/** Import once, preserving subsequent administrator edits and student progress. */
export async function importZeCourse(
  pool: Pool,
  content: ZeCourseInventory = initialZeCourse(),
  checkOnly = false,
) {
  validateZeCourse(content);
  const client = await pool.connect();
  const summary = { tracks: 0, lessons: 0, videos: 0, pending: 0 };
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '30s'");
    await client.query('SELECT pg_advisory_xact_lock(748310072::bigint)');
    const db = drizzle(client);
    const [track] = await db
      .insert(learningTracks)
      .values({
        slug: content.slug,
        title: content.title,
        expert: 'ze',
        kind: 'complementary_course',
        description: 'Aprenda a preparar sua loja e vender na Shopee com o Zé Mauro.',
        status: 'published',
        position: 10,
      })
      .onConflictDoNothing()
      .returning({ id: learningTracks.id });
    if (track) {
      summary.tracks++;
      for (const [stagePosition, stage] of content.stages.entries()) {
        const [createdStage] = await db
          .insert(learningStages)
          .values({
            trackId: track.id,
            slug: stage.slug,
            title: stage.title,
            position: stagePosition,
            status: 'published',
          })
          .returning({ id: learningStages.id });
        for (const [modulePosition, module] of stage.modules.entries()) {
          const [createdModule] = await db
            .insert(learningModules)
            .values({
              stageId: createdStage!.id,
              slug: module.slug,
              title: module.title,
              position: modulePosition,
              status: 'published',
            })
            .returning({ id: learningModules.id });
          for (const [position, lesson] of module.lessons.entries()) {
            const [createdLesson] = await db
              .insert(learningLessons)
              .values({
                moduleId: createdModule!.id,
                slug: lesson.slug,
                title: lesson.title,
                description: lesson.videoId ? null : ZE_PENDING_DESCRIPTION,
                position,
                countsTowardProgress: true,
                status: 'published',
              })
              .returning({ id: learningLessons.id });
            summary.lessons++;
            if (lesson.videoId) {
              await db.insert(learningContentBlocks).values({
                lessonId: createdLesson!.id,
                kind: 'video',
                position: 0,
                data: { provider: 'pandavideo', videoId: lesson.videoId },
              });
              summary.videos++;
            } else summary.pending++;
          }
        }
      }
    }
    await client.query(checkOnly ? 'ROLLBACK' : 'COMMIT');
    return summary;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
