/** Publica somente o inventário inicial já conferido, mantendo os vídeos como espaços vazios. */
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';
import { lessonPublicationIssue } from '@/features/admin/publication-rules';

if (process.env.NODE_ENV === 'production')
  throw new Error('A publicação inicial só pode ser executada em desenvolvimento.');

const originalSlugs = [
  'comece-aqui',
  'metodo-sll',
  'shopee-ads-completo',
  'afiliados-do-vendedor',
  'mentalidade-blindada',
];

const originalActionLinks: Array<[string, string]> = [
  ['dia-2-titulos-e-descricoes', 'titulos-descricao-precificacao'],
  ['dia-3-fotos-de-capa', 'anuncios-automaticos-fotos'],
  ['dia-4-oferta', 'desconto'],
  ['dia-5-atendimento-e-pedidos', 'como-gerar-etiqueta'],
  ['dia-6-revisao-da-semana', 'informacoes-gerenciais'],
  ['cupom-de-novo-seguidor', 'cupons'],
  ['videos-curtos-shopee-videos', 'videos-shopee-videos'],
  ['oferta-relampago', 'oferta-relampago-da-loja'],
  ['duplicar-anuncios', 'duplicando-anuncios-do-jeito-certo'],
  ['gerar-etiqueta-antes-do-primeiro-pedido', 'como-gerar-etiqueta'],
  ['responder-chat-em-12-horas', 'chat-de-ouro-avaliacoes-reputacao'],
  ['primeiras-avaliacoes', 'primeiras-avaliacoes'],
];

const tracks = await db.query.learningTracks.findMany({
  where: and(inArray(learningTracks.slug, originalSlugs), isNull(learningTracks.archivedAt)),
  with: {
    stages: {
      where: isNull(learningStages.archivedAt),
      with: {
        modules: {
          where: isNull(learningModules.archivedAt),
          with: {
            lessons: {
              where: isNull(learningLessons.archivedAt),
              with: { blocks: true },
            },
          },
        },
      },
    },
  },
});

for (const track of tracks) {
  const lessons = track.stages.flatMap((stage) => stage.modules.flatMap((group) => group.lessons));
  if (lessons.length === 0) {
    console.info(`${track.title}: sem aulas, mantido como rascunho.`);
    continue;
  }
  const issues = lessons.flatMap((lesson) => {
    const issue = lessonPublicationIssue(
      lesson.title,
      lesson.description,
      lesson.blocks.map((block) => ({
        kind: block.kind,
        data: block.data as Record<string, unknown>,
      })),
    );
    return issue ? [`${lesson.title}: ${issue}`] : [];
  });
  if (issues.length) {
    console.info(`${track.title}: mantido como rascunho. ${issues.join(' | ')}`);
    continue;
  }
  await db.transaction(async (tx) => {
    await tx
      .update(learningTracks)
      .set({ status: 'published' })
      .where(eq(learningTracks.id, track.id));
    for (const stage of track.stages) {
      await tx
        .update(learningStages)
        .set({ status: 'published' })
        .where(eq(learningStages.id, stage.id));
      for (const group of stage.modules) {
        await tx
          .update(learningModules)
          .set({ status: 'published' })
          .where(eq(learningModules.id, group.id));
        for (const lesson of group.lessons) {
          await tx
            .update(learningLessons)
            .set({ status: 'published' })
            .where(eq(learningLessons.id, lesson.id));
        }
      }
    }
  });
  if (track.slug === 'metodo-sll') {
    const bySlug = new Map(
      track.stages
        .filter((stage) => stage.slug !== 'etapa-2')
        .flatMap((stage) => stage.modules.flatMap((group) => group.lessons))
        .map((lesson) => [lesson.slug, lesson.id]),
    );
    for (const [actionSlug, targetSlug] of originalActionLinks) {
      const targetId = bySlug.get(targetSlug);
      const action = track.stages
        .flatMap((stage) => stage.modules)
        .flatMap((group) => group.lessons.map((lesson) => ({ ...lesson, groupSlug: group.slug })))
        .find(
          (lesson) =>
            (lesson.groupSlug === actionSlug && lesson.slug === 'acao-principal') ||
            lesson.slug === actionSlug,
        );
      if (action && targetId && !action.relatedLessonId)
        await db
          .update(learningLessons)
          .set({ relatedLessonId: targetId })
          .where(eq(learningLessons.id, action.id));
    }
  }
  console.info(`${track.title}: ${lessons.length} aulas publicadas com vídeos indisponíveis.`);
}

process.exit(0);
