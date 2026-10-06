/** Cria os três minicursos conferidos, com espaços vazios para os vídeos ainda não hospedados. */
import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningContentBlocks,
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';

const courses = [
  {
    slug: 'shopee-ads-completo',
    title: 'Shopee ADS — Do Zero',
    description: 'Tráfego pago na Shopee do zero ao controle de prejuízo.',
    lessons: [
      ['introducao-as-aulas-ze', 'Introdução às aulas', 2],
      ['introducao-ao-curso', 'Introdução ao curso', 1],
      ['introducao-ao-shopee-ads', 'Introdução ao Shopee Ads', 1],
      ['os-3-erros-que-iniciantes-cometem', 'Os 3 erros que iniciantes cometem', 4],
      ['encontrando-seu-roas-perfeito', 'Encontrando seu ROAS perfeito', 8],
      ['promover-novos-produtos', 'Promover novos produtos', 3],
      ['promover-produtos-com-avaliacao', 'Promover produtos com avaliação', 6],
      ['gmv-max-da-loja', 'GMV Max da Loja', 4],
      ['metricas-dos-anuncios', 'Métricas dos anúncios', 5],
      ['o-que-fazer-para-melhorar-o-anuncio', 'O que fazer para melhorar o anúncio', 10],
      ['como-evitar-o-prejuizo', 'Como evitar o prejuízo', 6],
      ['metricas-dos-anuncios-parte-2', 'Métricas dos anúncios (parte 2)', 5],
    ],
  },
  {
    slug: 'afiliados-do-vendedor',
    title: 'Afiliados do Vendedor',
    description: 'Use afiliados pra vender mais na Shopee — da comissão à campanha.',
    lessons: [
      ['introducao', 'Introdução', 3],
      ['como-funciona-para-o-afiliado', 'Como funciona para o afiliado', 2],
      ['qual-comissao-oferecer', 'Qual comissão oferecer', 7],
      ['campanha-aberta', 'Campanha aberta', 2],
      ['como-atrair-organicamente', 'Como atrair organicamente', 6],
      ['campanha-exclusiva', 'Campanha exclusiva', 6],
      ['vale-a-pena-para-o-meu-produto', 'Vale a pena para o meu produto?', 5],
      ['atualizacoes-fiscais', 'Atualizações fiscais', 6],
    ],
  },
  {
    slug: 'mentalidade-blindada',
    title: 'Blindada De Mim Mesma',
    description: 'Mentalidade, propósito e fé para você prosperar sem sabotar a si mesma.',
    lessons: [
      ['seja-bem-vinda', 'Seja bem-vinda', 15],
      ['quem-e-prisciane-pereira', 'Quem é Prisciane Pereira de verdade', 23],
      ['o-foco-no-que-voce-controla', 'O foco no que você controla', 26],
      ['a-comparacao', 'A comparação acaba com o que você nem construiu', 12],
      ['o-ambiente-forma-quem-voce-e', 'O ambiente forma quem você é', 31],
      ['um-plano-ruim-bem-executado', 'Um plano ruim bem executado', 6],
      ['o-que-me-fez-ser-prospera', 'O que me fez de fato ser próspera', 2],
      ['proposito-e-diferente-de-meta', 'Propósito é diferente de meta', 16],
      ['voce-acredita-em-deus', 'Você acredita de verdade em Deus', 11],
      ['voce-nasceu-para-prosperar', 'Você nasceu para prosperar', 17],
      ['relacao-verdadeira-com-deus', 'Estabeleça uma relação verdadeira com Deus', 8],
    ],
  },
] as const;

if (process.env.NODE_ENV === 'production')
  throw new Error('Importação permitida apenas no desenvolvimento.');

await db.transaction(async (tx) => {
  for (const [coursePosition, course] of courses.entries()) {
    await tx
      .insert(learningTracks)
      .values({
        kind: 'complementary_course',
        slug: course.slug,
        title: course.title,
        description: course.description,
        featured: course.slug === 'shopee-ads-completo',
        position: coursePosition,
      })
      .onConflictDoNothing();
    const [track] = await tx
      .select()
      .from(learningTracks)
      .where(eq(learningTracks.slug, course.slug))
      .limit(1);
    if (!track) throw new Error(`Não foi possível carregar ${course.title}.`);

    await tx
      .insert(learningStages)
      .values({ trackId: track.id, slug: 'curso', title: course.title, position: 0 })
      .onConflictDoNothing();
    const [stage] = await tx
      .select()
      .from(learningStages)
      .where(and(eq(learningStages.trackId, track.id), eq(learningStages.slug, 'curso')))
      .limit(1);
    if (!stage) throw new Error(`Não foi possível carregar o conteúdo de ${course.title}.`);

    await tx
      .insert(learningModules)
      .values({ stageId: stage.id, slug: 'aulas', title: 'Aulas', position: 0 })
      .onConflictDoNothing();
    const [module] = await tx
      .select()
      .from(learningModules)
      .where(and(eq(learningModules.stageId, stage.id), eq(learningModules.slug, 'aulas')))
      .limit(1);
    if (!module) throw new Error(`Não foi possível carregar as aulas de ${course.title}.`);

    for (const [position, [slug, title, durationMinutes]] of course.lessons.entries()) {
      await tx
        .insert(learningLessons)
        .values({
          moduleId: module.id,
          slug,
          title,
          durationMinutes,
          countsTowardProgress: true,
          position,
        })
        .onConflictDoNothing();
      const [lesson] = await tx
        .select({ id: learningLessons.id })
        .from(learningLessons)
        .where(and(eq(learningLessons.moduleId, module.id), eq(learningLessons.slug, slug)))
        .limit(1);
      if (!lesson) throw new Error(`Não foi possível carregar a aula ${title}.`);
      const video = await tx.query.learningContentBlocks.findFirst({
        columns: { id: true },
        where: and(
          eq(learningContentBlocks.lessonId, lesson.id),
          eq(learningContentBlocks.kind, 'video'),
        ),
      });
      if (!video)
        await tx.insert(learningContentBlocks).values({
          lessonId: lesson.id,
          kind: 'video',
          data: { provider: 'pandavideo', videoId: '' },
          position: 0,
        });
    }
  }
});

console.info(
  'Os três cursos e as 31 aulas têm espaços vazios para os vídeos. As capas ainda não foram fornecidas.',
);
process.exit(0);
