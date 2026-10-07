/** Importa os quatro passos observados na Etapa 1 sem publicar ou sobrescrever edições. */
import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningContentBlocks,
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';

const steps = [
  {
    slug: 'passo-1',
    title: 'Ativando Sua Conta de Vendedora em 10 minutos',
    lessons: [
      {
        slug: 'comece-por-aqui',
        title: 'Comece por aqui',
        description:
          'A aula de abertura da Etapa 1. A Pri dá as boas-vindas, mostra como a jornada está organizada e explica por onde começar pra não se perder. É o ponto de partida antes de mexer em qualquer configuração da loja.',
        duration: 8,
        // ID conferido no inventário T01 e usado pelo player Panda validado.
        video: '44408d11-f282-4a43-9949-8b3c44b94ee4',
      },
      {
        slug: 'credenciamento-shopee-vinculacao-escala-shop',
        title: 'Credenciamento na Shopee + vinculação Escala Shop',
        description:
          'O primeiro passo prático: fazer o cadastro e o credenciamento da sua conta de vendedora na Shopee e vincular à Escala Shop. A aula acompanha o processo do início ao fim pra deixar a base pronta antes de escolher fornecedor e produtos.',
        duration: 11,
        video: '0b7a6732-eb05-417b-9882-5f82fd0d1a58',
      },
    ],
  },
  {
    slug: 'passo-2',
    title: 'Resgate Seus Produtos Validados Pra Vender',
    lessons: [
      {
        slug: 'se-ambientando-envio-velox',
        title: 'Se ambientando com a Envio Velox',
        description:
          'Antes de conectar a loja, esta aula apresenta a Envio Velox: o que é, como navegar e o que esperar da plataforma de fornecedores curados. Você se ambienta com as telas principais pra chegar na conexão sabendo o que está fazendo.',
        duration: 9,
        video: '',
      },
      {
        slug: 'conectando-loja-envio-velox-fornecedor',
        title: 'Conectando sua loja na Envio Velox + Fornecedor',
        description:
          'A aula prática de conexão: você vincula sua loja Shopee à Envio Velox e ao fornecedor escolhido, deixando o fluxo de produtos pronto pra publicar. Passo a passo, do login à confirmação da conexão.',
        duration: 3,
        video: '',
      },
      {
        slug: 'configuracoes-essenciais-loja-pos-fornecedor',
        title: 'Configurações essenciais da loja (pós-fornecedor)',
        description:
          'Depois de escolher o fornecedor, tem um conjunto de configurações essenciais que a loja precisa ter antes de começar a vender. Esta aula cobre esses ajustes iniciais pra deixar a operação redonda.',
        duration: 13,
        video: '',
      },
    ],
  },
  {
    slug: 'passo-3',
    title: 'Colocando Seus Produtos no Ar Com Poucos Cliques',
    lessons: [
      {
        slug: 'anuncios-automaticos-fotos',
        title: 'Criando anúncios automáticos — Fotos',
        description:
          'O início do fluxo de publicação automática de anúncios na Shopee, com foco nas fotos do produto. A aula mostra como o processo gera o anúncio com poucos cliques a partir do material do fornecedor.',
        duration: 10,
        video: '',
      },
      {
        slug: 'titulos-descricao-precificacao',
        title: 'Títulos, Descrição e Precificação',
        description:
          'Esta aula cobre os três elementos que fazem o anúncio vender: título, descrição e precificação. Você aprende a montar os textos e definir o preço de forma automática dentro do fluxo de publicação.',
        duration: 9,
        video: '',
      },
      {
        slug: 'categoria-produto-gps-venda',
        title: 'Categoria do produto — o GPS da venda',
        description:
          'A categoria do produto é o GPS da venda: é ela que leva a cliente certa até o seu anúncio. Esta aula mostra como escolher e configurar a categoria do jeito certo no cadastro.',
        duration: 3,
        video: '',
      },
      {
        slug: 'especificacoes-produto',
        title: 'Especificações do produto',
        description:
          'As especificações são os atributos que a Shopee pede no cadastro do produto. Esta aula mostra quais preencher e como, pra o anúncio ficar completo e não travar na publicação.',
        duration: 2,
        video: '',
      },
      {
        slug: 'informacoes-fiscais',
        title: 'Informações Fiscais',
        description:
          'Esta aula cobre as informações fiscais do produto no cadastro da Shopee — os campos que garantem que o anúncio esteja regular. Passo a passo do que preencher em cada campo.',
        duration: 2,
        video: '',
      },
    ],
  },
  {
    slug: 'passo-4',
    title: 'Bora Comemorar Sua Primeira Venda?',
    lessons: [
      {
        slug: 'ativar-uma-promocao',
        title: 'Ativar uma promoção',
        description:
          'Esta aula ensina a ativar uma promoção nos seus produtos pra ganhar destaque na vitrine. Conteúdo em produção — a gravação será publicada em breve.',
        duration: 5,
        video: '',
      },
      {
        slug: 'impulsionar-anuncios-gratuitamente',
        title: 'Impulsionar anúncios gratuitamente',
        description:
          'Esta aula mostra como impulsionar seus anúncios gratuitamente na Shopee, ganhando mais alcance sem precisar investir em Ads pagos no começo.',
        duration: 8,
        video: '',
      },
      {
        slug: 'envio-pedidos-nao-assinante-envio-velox',
        title: 'Envio de pedidos — quem NÃO é assinante da Envio Velox',
        description:
          'Vendeu — e agora? Esta aula é o passo a passo do envio de pedidos pra quem não é assinante da Envio Velox, incluindo como gerar a etiqueta manualmente e despachar o pedido.',
        duration: 6,
        video: '',
      },
      {
        slug: 'envio-pedidos-assinante-envio-velox',
        title: 'Envio de pedidos — quem É assinante da Envio Velox',
        description:
          'Esta aula mostra o processo de envio de pedidos pra quem é assinante da Envio Velox, com o fluxo simplificado que a assinatura oferece.',
        duration: 2,
        video: '',
      },
      {
        slug: 'proximos-passos-o-que-fazer-agora',
        title: 'Próximos passos — o que fazer agora',
        description:
          'Concluiu a Etapa 1 com a loja no ar e vendendo. Esta aula aponta os próximos passos: o que priorizar agora pra manter a loja crescendo e onde continuar a jornada.',
        duration: 5,
        video: '',
      },
    ],
  },
] as const;

if (process.env.NODE_ENV === 'production') {
  console.error('A importação de conteúdo só pode ser executada em desenvolvimento.');
  process.exit(1);
}

await db.transaction(async (tx) => {
  await tx
    .insert(learningTracks)
    .values({
      kind: 'method',
      slug: 'metodo-sll',
      title: 'Método SLL',
      description: 'Sistema Loja Lucrativa — em 3 etapas sua loja no ar e vendendo.',
      position: 1,
    })
    .onConflictDoNothing();
  const [track] = await tx
    .select()
    .from(learningTracks)
    .where(eq(learningTracks.slug, 'metodo-sll'))
    .limit(1);
  if (!track) throw new Error('Não foi possível carregar a trilha Método SLL.');
  if (!track.description) {
    await tx
      .update(learningTracks)
      .set({ description: 'Sistema Loja Lucrativa — em 3 etapas sua loja no ar e vendendo.' })
      .where(eq(learningTracks.id, track.id));
  }

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
  if (!stage) throw new Error('Não foi possível carregar a Etapa 1.');

  let position = 0;
  for (const step of steps) {
    await tx
      .insert(learningModules)
      .values({ stageId: stage.id, slug: step.slug, title: step.title, position: position++ })
      .onConflictDoNothing();
    const [module] = await tx
      .select()
      .from(learningModules)
      .where(and(eq(learningModules.stageId, stage.id), eq(learningModules.slug, step.slug)))
      .limit(1);
    if (!module) throw new Error(`Não foi possível carregar ${step.title}.`);

    for (const [lessonPosition, item] of step.lessons.entries()) {
      await tx
        .insert(learningLessons)
        .values({
          moduleId: module.id,
          slug: item.slug,
          title: item.title,
          description: item.description,
          durationMinutes: item.duration,
          position: lessonPosition,
        })
        .onConflictDoNothing();
      const [lesson] = await tx
        .select({ id: learningLessons.id })
        .from(learningLessons)
        .where(and(eq(learningLessons.moduleId, module.id), eq(learningLessons.slug, item.slug)))
        .limit(1);
      if (!lesson) throw new Error(`Não foi possível carregar a aula ${item.title}.`);

      const video = await tx.query.learningContentBlocks.findFirst({
        columns: { id: true, data: true },
        where: and(
          eq(learningContentBlocks.lessonId, lesson.id),
          eq(learningContentBlocks.kind, 'video'),
        ),
      });
      if (!video) {
        await tx.insert(learningContentBlocks).values({
          lessonId: lesson.id,
          kind: 'video',
          data: { provider: 'pandavideo', videoId: item.video },
          position: 0,
        });
      } else if (item.video && 'videoId' in video.data && video.data.videoId === '') {
        // Completa apenas o placeholder vazio importado antes da confirmação; uma edição feita
        // no admin continua prevalecendo quando já houver outro ID salvo.
        await tx
          .update(learningContentBlocks)
          .set({ data: { provider: 'pandavideo', videoId: item.video } })
          .where(eq(learningContentBlocks.id, video.id));
      }
    }
  }
});

console.info('Os quatro passos e as quinze aulas foram importados como rascunho.');
process.exit(0);
