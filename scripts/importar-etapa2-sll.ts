/** Importa o plano observado no inventário sem publicar nem substituir edições existentes. */
import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  learningLessons,
  learningModules,
  learningStages,
  learningTracks,
} from '@/server/db/schema';

const priorities = [
  {
    slug: 'dia-1-perfil-da-loja',
    title: 'Dia 1 · Perfil da loja',
    lesson: 'Completar o perfil da loja (foto, nome, bio)',
    description:
      'Abra o Perfil da Loja na Central do Vendedor. Escolha um nome memorável e fácil de escrever. Use o logo feito na Etapa 1 como avatar. Escreva uma bio de 2 linhas sobre a loja. Suba o banner feito no GPT SLL — Logo ou uma foto do nicho. Revise o perfil uma vez por mês.',
  },
  {
    slug: 'dia-2-titulos-e-descricoes',
    title: 'Dia 2 · Títulos e descrições',
    lesson: 'Reescrever título e descrição dos seus 5 produtos',
    description:
      'Abra o produto no fluxo de publicação. Defina o título pelo modelo da aula. Monte a descrição com as informações do produto e defina o preço. Revise os três antes de publicar.',
  },
  {
    slug: 'dia-3-fotos-de-capa',
    title: 'Dia 3 · Fotos de capa',
    lesson: 'Trocar a foto de capa de cada anúncio',
    description:
      'Abra o fluxo de publicação automática. Selecione o produto do fornecedor e use as fotos do material dele. Escolha a foto principal e confirme a geração automática.',
  },
  {
    slug: 'dia-4-oferta',
    title: 'Dia 4 · Oferta',
    lesson: 'Ativar desconto nos seus produtos',
    description:
      'Abra Central de Marketing > desconto e escolha o produto. Aplique 25% de desconto, confira a margem, mantenha o desconto ativo e use cupom como bônus.',
  },
  {
    slug: 'dia-5-atendimento-e-pedidos',
    title: 'Dia 5 · Atendimento e pedidos',
    lesson: 'Organizar atendimento e pedidos',
    description:
      'Confira onde acompanhar o chat e reserve um horário para responder. Aprenda a gerar etiqueta e preparar o envio. Verifique pendências ou, sem pedidos, deixe a rotina preparada.',
  },
  {
    slug: 'dia-6-revisao-da-semana',
    title: 'Dia 6 · Revisão da semana',
    lesson: 'Conferir as ações e os primeiros dados',
    description:
      'Revise as ações anteriores e anote pendências. Confira visitas e pedidos nas Informações Gerenciais. Registre quando ainda não houver dados ou vendas e escolha uma prioridade para a semana seguinte.',
  },
] as const;

const optionalActions = [
  [
    'cupom-de-novo-seguidor',
    'Criar cupom de novo seguidor',
    'Abra Central de Marketing > cupons. Crie cupom de novo seguidor com 5%, cupom da loja com valor mínimo e cupom de frete grátis somente para produtos que absorvem o custo. Ative primeiro o de novo seguidor.',
  ],
  [
    'videos-curtos-shopee-videos',
    'Publicar 3 vídeos curtos no Shopee Vídeos',
    'Grave perto de uma janela com luz natural, faça tomadas de uso real, detalhes e ângulos, edite no CapCut com modelo em 3 atos, envie para a aba Vídeo do anúncio e reaproveite em Reels, TikTok e story.',
  ],
  [
    'oferta-relampago',
    'Criar uma Oferta Relâmpago',
    'Escolha produto que já vende. Crie a oferta na Central de Marketing, defina janela de 2 a 4 horas, aplique preço 10% a 15% abaixo do preço já com desconto e agende para sábado às 20h ou domingo às 14h. Avise no story.',
  ],
  [
    'duplicar-anuncios',
    'Duplicar seus 2 melhores anúncios',
    'Escolha produto que já vende. Crie segundo anúncio com outra foto principal, mude a ordem das palavras do título mantendo as palavras-chave, reescreva a abertura da descrição e mantenha as especificações. Cadastre como produto novo, não como cópia.',
  ],
  [
    'gerar-etiqueta-antes-do-primeiro-pedido',
    'Aprender a gerar etiqueta antes do 1º pedido',
    'Confirme o pedido na Central do Vendedor. Emita etiqueta Shopee Express em PDF, imprima e cole na embalagem, leve ao ponto de coleta ou agende coleta, atualize o status e poste em até 2 dias.',
  ],
  [
    'responder-chat-em-12-horas',
    'Responder o chat em até 12 horas',
    'Abra o chat da Shopee. Responda em até 2h no horário comercial e no máximo 12h. Use scripts dos cinco cenários, ofereça voucher para carrinho abandonado e acompanhe tempo e taxa de resposta.',
  ],
  [
    'primeiras-avaliacoes',
    'Conseguir suas primeiras avaliações',
    'Inclua cartão de agradecimento com QR. Envie mensagem 3 dias após a entrega, peça avaliação honesta sem pedir 5 estrelas, ofereça cupom de 10% para a próxima compra e mire 5 a 10 avaliações reais nas primeiras duas semanas.',
  ],
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
      slug: 'etapa-2',
      title: 'Seu plano de 7 dias',
      description: 'Saiba o que priorizar na sua loja e siga o passo a passo de cada ação.',
      position: 1,
    })
    .onConflictDoNothing();
  const [stage] = await tx
    .select()
    .from(learningStages)
    .where(and(eq(learningStages.trackId, track.id), eq(learningStages.slug, 'etapa-2')))
    .limit(1);
  if (!stage) throw new Error('Não foi possível carregar a Etapa 2.');

  for (const [position, item] of priorities.entries()) {
    await tx
      .insert(learningModules)
      .values({ stageId: stage.id, slug: item.slug, title: item.title, position })
      .onConflictDoNothing();
    const [module] = await tx
      .select()
      .from(learningModules)
      .where(and(eq(learningModules.stageId, stage.id), eq(learningModules.slug, item.slug)))
      .limit(1);
    if (!module) throw new Error(`Não foi possível carregar ${item.title}.`);
    await tx
      .insert(learningLessons)
      .values({
        moduleId: module.id,
        slug: 'acao-principal',
        title: item.lesson,
        description: item.description,
        countsTowardProgress: true,
        position: 0,
      })
      .onConflictDoNothing();
  }

  await tx
    .insert(learningModules)
    .values({
      stageId: stage.id,
      slug: 'acoes-complementares',
      title: 'Ações complementares',
      description:
        'Aprofunde o que fizer sentido para sua loja. Estas ações não entram na contagem das 6 prioridades.',
      position: priorities.length,
    })
    .onConflictDoNothing();
  const [optionalModule] = await tx
    .select()
    .from(learningModules)
    .where(
      and(eq(learningModules.stageId, stage.id), eq(learningModules.slug, 'acoes-complementares')),
    )
    .limit(1);
  if (!optionalModule) throw new Error('Não foi possível carregar as ações complementares.');
  for (const [position, [slug, title, description]] of optionalActions.entries()) {
    await tx
      .insert(learningLessons)
      .values({
        moduleId: optionalModule.id,
        slug,
        title,
        description,
        countsTowardProgress: false,
        position,
      })
      .onConflictDoNothing();
  }
});

console.info('As seis prioridades e sete ações complementares foram importadas como rascunho.');
process.exit(0);
