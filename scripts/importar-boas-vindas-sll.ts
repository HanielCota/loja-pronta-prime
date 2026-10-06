/** Importa a trilha de boas-vindas observada no site antigo, sem publicar nem sobrescrever edições. */
import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningContentBlocks,
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';

const lessons = [
  ['boas-vindas', 'Boas-vindas ao SLL'],
  ['a-tribo-das-soberanas', 'A tribo das soberanas'],
  ['a-decisao-para-se-tornar-uma-soberana', 'A decisão para se tornar uma soberana'],
  ['de-clt-a-2-milhoes', 'Como eu saí de CLT para faturar mais de 2 milhões'],
  ['entrevista-lari-e-leo', 'Entrevista Lari e Leo'],
  ['agir-por-decisao', 'Você vai agir por decisão e não por condição'],
] as const;

if (process.env.NODE_ENV === 'production') {
  console.error('A importação de conteúdo só pode ser executada em desenvolvimento.');
  process.exit(1);
}

await db.transaction(async (tx) => {
  await tx
    .insert(learningTracks)
    .values({
      kind: 'welcome',
      slug: 'comece-aqui',
      title: 'Comece aqui',
      description:
        'Antes de começar as aulas, assista a esta mensagem da Pri. Ela vai te mostrar como aproveitar o SLL com clareza, no seu ritmo e com um caminho simples para começar.',
      position: 0,
    })
    .onConflictDoNothing();
  const [track] = await tx
    .select({ id: learningTracks.id })
    .from(learningTracks)
    .where(eq(learningTracks.slug, 'comece-aqui'))
    .limit(1);
  if (!track) throw new Error('Não foi possível criar a trilha de boas-vindas.');

  await tx
    .insert(learningStages)
    .values({ trackId: track.id, slug: 'boas-vindas', title: 'Trilha de boas-vindas', position: 0 })
    .onConflictDoNothing();
  const [stage] = await tx
    .select({ id: learningStages.id })
    .from(learningStages)
    .where(and(eq(learningStages.trackId, track.id), eq(learningStages.slug, 'boas-vindas')))
    .limit(1);
  if (!stage) throw new Error('Não foi possível criar o grupo de boas-vindas.');

  await tx
    .insert(learningModules)
    .values({ stageId: stage.id, slug: 'aulas', title: 'Aulas', position: 0 })
    .onConflictDoNothing();
  const [module] = await tx
    .select({ id: learningModules.id })
    .from(learningModules)
    .where(and(eq(learningModules.stageId, stage.id), eq(learningModules.slug, 'aulas')))
    .limit(1);
  if (!module) throw new Error('Não foi possível criar a lista de aulas.');

  for (const [position, [slug, title]] of lessons.entries()) {
    await tx
      .insert(learningLessons)
      .values({ moduleId: module.id, slug, title, position })
      .onConflictDoNothing();
    const [lesson] = await tx
      .select({ id: learningLessons.id })
      .from(learningLessons)
      .where(and(eq(learningLessons.moduleId, module.id), eq(learningLessons.slug, slug)))
      .limit(1);
    if (!lesson) throw new Error(`Não foi possível criar a aula ${title}.`);

    const existingVideo = await tx.query.learningContentBlocks.findFirst({
      columns: { id: true },
      where: and(
        eq(learningContentBlocks.lessonId, lesson.id),
        eq(learningContentBlocks.kind, 'video'),
      ),
    });
    if (!existingVideo) {
      await tx.insert(learningContentBlocks).values({
        lessonId: lesson.id,
        kind: 'video',
        data: { provider: 'pandavideo', videoId: '' },
        position: 0,
      });
    }
  }
});

console.info('As seis aulas observadas foram importadas como rascunho.');
process.exit(0);
