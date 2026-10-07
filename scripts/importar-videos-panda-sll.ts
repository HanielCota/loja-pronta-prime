/** Vincula o catálogo conferido às aulas existentes, preservando edições e progresso. */
import { asc, eq, isNull, sql } from 'drizzle-orm';
import catalog from '../data/sll/panda-videos.json';
import { pandaVideoImportDecision } from '@/features/sll/panda-video';
import { db } from '@/server/db';
import { learningContentBlocks, learningLessons, learningNodeDrafts } from '@/server/db/schema';

const checkOnly = process.argv.includes('--check');
const summary = await db.transaction(
  async (tx) => {
    const [lessons, drafts] = await Promise.all([
      tx.query.learningLessons.findMany({
        where: isNull(learningLessons.archivedAt),
        with: {
          blocks: { orderBy: [asc(learningContentBlocks.position)] },
          module: { with: { stage: { with: { track: true } } } },
        },
      }),
      tx
        .select({ nodeId: learningNodeDrafts.nodeId })
        .from(learningNodeDrafts)
        .where(eq(learningNodeDrafts.kind, 'lesson')),
    ]);
    const byPath = new Map(
      lessons
        .filter(
          (lesson) =>
            !lesson.module.archivedAt &&
            !lesson.module.stage.archivedAt &&
            !lesson.module.stage.track.archivedAt,
        )
        .map((lesson) => [
          [
            lesson.module.stage.track.slug,
            lesson.module.stage.slug,
            lesson.module.slug,
            lesson.slug,
          ].join('/'),
          lesson,
        ]),
    );
    const draftIds = new Set(drafts.map((draft) => draft.nodeId));
    const entries = catalog.sections.flatMap((section) =>
      section.groups.flatMap((group) =>
        group.lessons.map((item) => {
          const path = [
            group.project.trackSlug,
            group.project.stageSlug,
            group.project.moduleSlug,
            item.projectLessonSlug,
          ].join('/');
          const lesson = byPath.get(path);
          if (!lesson)
            throw new Error(`Aula não encontrada: ${path}. Importe primeiro a estrutura do SLL.`);
          return { item, lesson, path };
        }),
      ),
    );
    const counts = { inserted: 0, filled: 0, ready: 0, skipped: [] as string[] };
    for (const { item, lesson, path } of entries) {
      const videos = lesson.blocks.filter((block) => block.kind === 'video');
      const decision = pandaVideoImportDecision(
        videos.map((block) => ({ data: block.data as Record<string, unknown> })),
        item.videoId,
      );
      if (decision === 'ready') {
        counts.ready++;
        continue;
      }
      if (draftIds.has(lesson.id) || decision === 'conflict') {
        counts.skipped.push(path);
        continue;
      }
      if (decision === 'fill') {
        if (!checkOnly)
          await tx
            .update(learningContentBlocks)
            .set({ data: { ...videos[0]!.data, provider: 'pandavideo', videoId: item.videoId } })
            .where(eq(learningContentBlocks.id, videos[0]!.id));
        counts.filled++;
      } else {
        if (!checkOnly) {
          // Abre a primeira posição sem mudar a ordem dos textos ou materiais existentes.
          await tx
            .update(learningContentBlocks)
            .set({ position: sql`${learningContentBlocks.position} + 1` })
            .where(eq(learningContentBlocks.lessonId, lesson.id));
          await tx.insert(learningContentBlocks).values({
            lessonId: lesson.id,
            kind: 'video',
            data: { provider: 'pandavideo', videoId: item.videoId },
            position: 0,
          });
        }
        counts.inserted++;
      }
    }
    return counts;
  },
  { isolationLevel: 'serializable' },
);

console.info(
  `${checkOnly ? 'Conferência' : 'Importação'}: ${summary.inserted} vídeos novos, ${summary.filled} espaços preenchidos, ${summary.ready} aulas já vinculadas.`,
);
if (summary.skipped.length)
  console.info(`Edições preservadas, conferir no admin: ${summary.skipped.join(', ')}`);
process.exit(0);
