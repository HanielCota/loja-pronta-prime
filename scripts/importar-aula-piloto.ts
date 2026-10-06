/** Importa uma aula observada no site antigo sem substituir ajustes feitos no painel. */
import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningContentBlocks,
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';

if (process.env.NODE_ENV === 'production') {
  console.error('A importação piloto só pode ser executada no ambiente de desenvolvimento.');
  process.exit(1);
}

/** IDs fixos dos blocos: repetir a importação não duplica texto ou vídeo. */
const PILOT_BLOCK_IDS = {
  video: '614abfcb-0910-4baf-9c28-e8b2048f3010',
  text: '2875bcb2-5530-46ab-b53f-2129dc7b2de1',
} as const;

await db.transaction(async (tx) => {
  // Cada inserção ignora conflitos e nunca atualiza um conteúdo que o admin já editou.
  await tx
    .insert(learningTracks)
    .values({ kind: 'method', slug: 'metodo-sll', title: 'Método SLL', position: 1 })
    .onConflictDoNothing();
  const [track] = await tx
    .select()
    .from(learningTracks)
    .where(eq(learningTracks.slug, 'metodo-sll'))
    .limit(1);
  if (!track) throw new Error('Não foi possível encontrar a trilha piloto.');

  await tx
    .insert(learningStages)
    .values({
      trackId: track.id,
      slug: 'etapa-1',
      title: 'Sua loja no ar em 7 dias',
      description:
        'Tudo que você precisa pra criar a sua loja e colocar ela no ar pronta pra vender em apenas 4 passos. Em 7 dias, sua loja no ar com produtos prontos e validados!',
      position: 0,
    })
    .onConflictDoNothing();
  const [stage] = await tx
    .select()
    .from(learningStages)
    .where(and(eq(learningStages.trackId, track.id), eq(learningStages.slug, 'etapa-1')))
    .limit(1);
  const pilotStage = stage;
  if (!pilotStage) throw new Error('Não foi possível encontrar a Etapa 1 piloto.');

  await tx
    .insert(learningModules)
    .values({
      stageId: pilotStage.id,
      slug: 'passo-1',
      title: 'Ativando Sua Conta de Vendedora em 10 minutos',
      position: 0,
    })
    .onConflictDoNothing();
  const [module] = await tx
    .select()
    .from(learningModules)
    .where(and(eq(learningModules.stageId, pilotStage.id), eq(learningModules.slug, 'passo-1')))
    .limit(1);
  const pilotModule = module;
  if (!pilotModule) throw new Error('Não foi possível encontrar o módulo piloto.');

  await tx
    .insert(learningLessons)
    .values({
      moduleId: pilotModule.id,
      slug: 'comece-por-aqui',
      title: 'Comece por aqui',
      description: 'O jeito certo de começar a Etapa 1',
      durationMinutes: 8,
      position: 0,
    })
    .onConflictDoNothing();
  const [lesson] = await tx
    .select()
    .from(learningLessons)
    .where(
      and(
        eq(learningLessons.moduleId, pilotModule.id),
        eq(learningLessons.slug, 'comece-por-aqui'),
      ),
    )
    .limit(1);
  const pilotLesson = lesson;
  if (!pilotLesson) throw new Error('Não foi possível encontrar a aula piloto.');

  await tx
    .insert(learningContentBlocks)
    .values([
      {
        id: PILOT_BLOCK_IDS.video,
        lessonId: pilotLesson.id,
        kind: 'video',
        data: { provider: 'pandavideo', videoId: '' },
        position: 0,
      },
      {
        id: PILOT_BLOCK_IDS.text,
        lessonId: pilotLesson.id,
        kind: 'text',
        data: {
          text: 'A aula de abertura da Etapa 1. A Pri dá as boas-vindas, mostra como a jornada está organizada e explica por onde começar pra não se perder. É o ponto de partida antes de mexer em qualquer configuração da loja.',
        },
        position: 1,
      },
    ])
    .onConflictDoNothing();
});

console.info(
  'A aula piloto foi conferida. Rerodar não duplica nem sobrescreve conteúdos existentes.',
);
process.exit(0);
