import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import type { Pool } from 'pg';
import {
  learningContentBlocks,
  learningLessons,
  learningModules,
  learningResources,
  learningStages,
  learningTracks,
} from '@/server/db/schema';
import {
  initialSllContent,
  validateInitialSllContent,
  type InitialSllContent,
} from '../initial-content';
import { sllLibrarySourceNumber } from '../source-numbers';

/** Só cria trilhas ausentes. Conteúdo do admin, arquivos e progresso nunca são copiados ou alterados. */
export async function importInitialSllContent(
  pool: Pool,
  content: InitialSllContent = initialSllContent(),
  checkOnly = false,
) {
  validateInitialSllContent(content);
  const client = await pool.connect();
  const summary = { tracks: 0, lessons: 0, videos: 0, resources: 0 };
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '30s'");
    // Dois deploys simultâneos não podem criar partes de uma mesma trilha.
    await client.query('SELECT pg_advisory_xact_lock(748310071::bigint)');
    const db = drizzle(client);
    for (const track of content.tracks) {
      const [created] = await db
        .insert(learningTracks)
        .values({
          kind: track.kind,
          slug: track.slug,
          title: track.title,
          description: track.description,
          position: track.position,
          featured: track.featured,
          status: 'published',
        })
        .onConflictDoNothing()
        .returning({ id: learningTracks.id });
      // Inclusive trilhas arquivadas ou em rascunho: a decisão do admin prevalece.
      if (!created) continue;
      summary.tracks++;
      const lessonsBySlug = new Map<string, string>();
      const references: Array<{ id: string; target: string }> = [];
      for (const [stagePosition, stage] of track.stages.entries()) {
        const [createdStage] = await db
          .insert(learningStages)
          .values({
            trackId: created.id,
            slug: stage.slug,
            title: stage.title,
            description: stage.description,
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
              description: module.description,
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
                description: lesson.description,
                sourceNumber: stage.slug === 'etapa-3' ? sllLibrarySourceNumber(lesson.slug) : null,
                durationMinutes: lesson.durationMinutes,
                countsTowardProgress: lesson.countsTowardProgress,
                position,
                status: 'published',
              })
              .returning({ id: learningLessons.id });
            lessonsBySlug.set(lesson.slug, createdLesson!.id);
            summary.lessons++;
            if (lesson.relatedLessonSlug)
              references.push({ id: createdLesson!.id, target: lesson.relatedLessonSlug });
            if (lesson.videoId) {
              await db.insert(learningContentBlocks).values({
                lessonId: createdLesson!.id,
                kind: 'video',
                data: { provider: 'pandavideo', videoId: lesson.videoId },
                position: 0,
              });
              summary.videos++;
            }
          }
        }
      }
      for (const reference of references) {
        const relatedLessonId = lessonsBySlug.get(reference.target);
        if (!relatedLessonId) throw new Error('Aula de referência não importada.');
        await db
          .update(learningLessons)
          .set({ relatedLessonId })
          .where(eq(learningLessons.id, reference.id));
      }
    }
    for (const resource of content.resources) {
      const created = await db
        .insert(learningResources)
        .values({ ...resource, status: 'published' })
        .onConflictDoNothing()
        .returning({ id: learningResources.id });
      summary.resources += created.length;
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
