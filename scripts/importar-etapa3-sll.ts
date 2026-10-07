/** Importa as 19 aulas visíveis da Biblioteca, sem inventar as oito aulas citadas só no texto. */
import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';
import {
  sllLibrarySourceDurationMinutes,
  sllLibrarySourceNumber,
} from '@/features/sll/source-numbers';

const categories = [
  {
    slug: 'conheca-sua-nova-fonte-de-renda',
    title: 'Conheça sua nova fonte de renda',
    lessons: [
      [
        'o-que-e-um-marketplace',
        'O que é um marketplace?',
        'Por que vender em marketplace é um modelo rápido para começar do zero.',
      ],
      [
        'por-que-a-shopee',
        'Por que a Shopee?',
        'Frete subsidiado, programa de novos vendedores e algoritmo para quem começa.',
      ],
    ],
  },
  {
    slug: 'pedido',
    title: 'Pedido',
    lessons: [
      ['como-gerar-etiqueta', 'Como gerar etiqueta', 'Do pedido à emissão, impressão e postagem.'],
    ],
  },
  {
    slug: 'central-de-marketing',
    title: 'Central de Marketing',
    lessons: [
      ['desconto', 'Desconto', 'Quando usar desconto em vez de cupom.'],
      ['oferta-relampago-da-loja', 'Oferta Relâmpago da Loja', 'Oferta por tempo limitado.'],
      ['cupons', 'Cupons', 'Três tipos de cupom e a sequência sugerida.'],
      [
        'campanha-ofertas-oficiais',
        'Campanha — se inscrevendo em ofertas oficiais',
        'Preparação e inscrição em campanhas da Shopee.',
      ],
    ],
  },
  {
    slug: 'estrategias-de-visibilidade',
    title: 'Estratégias de visibilidade',
    lessons: [
      [
        'duplicando-anuncios-do-jeito-certo',
        'Duplicando anúncios do jeito certo',
        'Variar anúncios sem fazer cópia literal.',
      ],
      ['teste-de-categoria', 'Teste de categoria', 'Comparar categorias para o mesmo produto.'],
      [
        'videos-shopee-videos',
        'Como conseguir vídeos para Shopee Vídeos?',
        'Gravar e reaproveitar vídeos.',
      ],
      [
        'primeiras-avaliacoes',
        'Como conseguir as primeiras avaliações?',
        'Táticas legítimas para começar.',
      ],
    ],
  },
  {
    slug: 'atendimento-ao-cliente',
    title: 'Atendimento ao cliente',
    lessons: [
      [
        'chat-de-ouro-avaliacoes-reputacao',
        'Chat de Ouro, Avaliações e Reputação',
        'Tempo de resposta, tom de atendimento e vouchers.',
      ],
    ],
  },
  {
    slug: 'financas',
    title: 'Finanças',
    lessons: [
      ['minha-renda', 'Minha Renda', 'Faturamento, taxas e valor líquido.'],
      ['saldo-da-carteira', 'Saldo da Carteira', 'Retenção e saque.'],
    ],
  },
  {
    slug: 'dados',
    title: 'Dados',
    lessons: [
      [
        'informacoes-gerenciais',
        'Informações Gerenciais',
        'Vendas, visitas, conversão e produtos em destaque.',
      ],
      ['desempenho-da-conta', 'Desempenho da Conta', 'Métricas de saúde e revisão periódica.'],
    ],
  },
  {
    slug: 'loja',
    title: 'Loja',
    lessons: [
      [
        'decoracao-da-loja',
        'Decoração da Loja',
        'Coleções, banners internos e produtos em destaque.',
      ],
      [
        'configuracoes-da-loja',
        'Configurações da Loja',
        'Modo férias, avisos, trocas, prazo de envio e notificações.',
      ],
      [
        'gestao-de-contestacao',
        'Gestão de Contestação',
        'Responder a disputas e solicitações de reembolso ou troca.',
      ],
    ],
  },
] as const;

if (process.env.NODE_ENV === 'production')
  throw new Error('Importação permitida apenas no desenvolvimento.');

await db.transaction(async (tx) => {
  const [track] = await tx
    .select()
    .from(learningTracks)
    .where(eq(learningTracks.slug, 'metodo-sll'))
    .limit(1);
  if (!track) throw new Error('Importe primeiro a trilha do Método SLL.');
  await tx
    .insert(learningStages)
    .values({
      trackId: track.id,
      slug: 'etapa-3',
      title: 'Biblioteca de Conhecimento',
      description:
        'Sua biblioteca de referência — 19 aulas cobrindo tudo dentro da Central do Vendedor. Aqui não tem ordem: use a busca ou navegue por categoria.',
      position: 2,
    })
    .onConflictDoNothing();
  const [stage] = await tx
    .select()
    .from(learningStages)
    .where(and(eq(learningStages.trackId, track.id), eq(learningStages.slug, 'etapa-3')))
    .limit(1);
  if (!stage) throw new Error('Não foi possível carregar a Etapa 3.');
  // O texto antigo dizia 27, mas o inventário confirmou somente 19 aulas disponíveis.
  if (
    stage.description ===
    'Sua biblioteca de referência — 27 aulas cobrindo tudo dentro da Central do Vendedor. Aqui não tem ordem: use a busca ou navegue por categoria.'
  ) {
    await tx
      .update(learningStages)
      .set({
        description:
          'Sua biblioteca de referência — 19 aulas cobrindo tudo dentro da Central do Vendedor. Aqui não tem ordem: use a busca ou navegue por categoria.',
      })
      .where(eq(learningStages.id, stage.id));
  }

  for (const [categoryPosition, category] of categories.entries()) {
    await tx
      .insert(learningModules)
      .values({
        stageId: stage.id,
        slug: category.slug,
        title: category.title,
        position: categoryPosition,
      })
      .onConflictDoNothing();
    const [module] = await tx
      .select()
      .from(learningModules)
      .where(and(eq(learningModules.stageId, stage.id), eq(learningModules.slug, category.slug)))
      .limit(1);
    if (!module) throw new Error(`Não foi possível carregar ${category.title}.`);
    for (const [position, [slug, title, description]] of category.lessons.entries()) {
      const sourceNumber = sllLibrarySourceNumber(slug);
      if (sourceNumber === null) {
        throw new Error(`A numeração antiga da aula ${slug} ainda não foi conferida.`);
      }
      const durationMinutes = sllLibrarySourceDurationMinutes(slug);
      await tx
        .insert(learningLessons)
        .values({
          moduleId: module.id,
          slug,
          title,
          description,
          sourceNumber,
          ...(durationMinutes === null ? {} : { durationMinutes }),
          countsTowardProgress: true,
          position,
        })
        .onConflictDoUpdate({
          target: [learningLessons.moduleId, learningLessons.slug],
          set: {
            sourceNumber,
            ...(durationMinutes === null ? {} : { durationMinutes }),
          },
        });
    }
  }
});

const lessonCount = categories.reduce((count, category) => count + category.lessons.length, 0);
const durationCount = categories.reduce(
  (count, category) =>
    count +
    category.lessons.filter(([slug]) => sllLibrarySourceDurationMinutes(slug) !== null).length,
  0,
);
console.info(
  `${lessonCount} aulas em ${categories.length} categorias conferidas; ${durationCount} durações confirmadas gravadas. Os oito itens não vistos não foram criados; estados de publicação existentes foram preservados.`,
);
process.exit(0);
