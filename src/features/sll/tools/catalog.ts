import type { CalculatorKind } from './form-input';

export const CALCULATORS: Record<
  string,
  { kind: CalculatorKind; slug: string; title: string; intro: string }
> = {
  'calculadora-shopee': {
    kind: 'price',
    slug: 'calculadora-preco-shopee',
    title: 'Calculadora de preço e lucro',
    intro: 'Descubra um preço que cubra seus custos e deixe a margem que você escolheu.',
  },
  'simulador-descontos': {
    kind: 'discount',
    slug: 'simulador-descontos',
    title: 'Simulador de descontos',
    intro: 'Veja quanto sobra depois de oferecer desconto e cupom.',
  },
  'calculadora-anuncios': {
    kind: 'ads',
    slug: 'calculadora-anuncios',
    title: 'Calculadora de anúncios',
    intro:
      'Descubra quanto pode gastar em anúncios por venda e quanto cada real investido precisa voltar em vendas (o ROAS).',
  },
};

export const TOOL_MATERIALS = [
  {
    slug: 'guia-ferramentas',
    title: 'Guia das calculadoras SLL',
    fileName: 'guia-ferramentas-sll.pdf',
    contentType: 'application/pdf',
    description: 'Como preencher os custos e entender preço, desconto e anúncios.',
    storageKey: 'sll/tools/2026-10-07/guia-ferramentas-sll.pdf',
  },
  {
    slug: 'planilha-custos',
    title: 'Planilha de custos e lucro',
    fileName: 'planilha-custos-sll.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    description: 'Uma planilha para registrar custos e simular uma venda com as taxas da sua loja.',
    storageKey: 'sll/tools/2026-10-07/planilha-custos-sll.xlsx',
  },
] as const;

/** Inventário dos originais; ficam em breve até um arquivo real ser enviado na aula. */
export const ORIGINAL_MATERIALS = [
  {
    lessonSlug: 'como-gerar-etiqueta',
    title: 'Pontos de coleta Shopee Express — como achar',
    type: 'PDF',
  },
  { lessonSlug: 'campanha-ofertas-oficiais', title: 'Calendário Shopee BR 2026', type: 'PDF' },
  { lessonSlug: 'videos-shopee-videos', title: 'Roteiro de vídeo em 3 atos', type: 'ZIP' },
  { lessonSlug: 'primeiras-avaliacoes', title: 'Cartão de agradecimento — 3 modelos', type: 'PDF' },
  {
    lessonSlug: 'chat-de-ouro-avaliacoes-reputacao',
    title: 'Scripts de resposta — 5 cenários',
    type: 'PDF',
  },
  { lessonSlug: 'informacoes-gerenciais', title: 'KPIs Shopee — como interpretar', type: 'PDF' },
  { lessonSlug: 'desempenho-da-conta', title: 'Dashboard pessoal — checklist', type: 'XLSX' },
  { lessonSlug: 'decoracao-da-loja', title: 'Specs Shopee — banners e coleções', type: 'PDF' },
  {
    lessonSlug: 'gestao-de-contestacao',
    title: 'Templates de resposta a contestação',
    type: 'PDF',
  },
] as const;

export const ASSISTANT_GUIDES: Record<
  string,
  { title: string; instructions: string[]; prompt: string; lessonSlugs: string[] }
> = {
  'mentora-pri': {
    title: 'Mentora Pri',
    instructions: [
      'Diga em qual etapa do método você está e qual é sua dúvida.',
      'Conte o que já tentou e o resultado que teve.',
      'Peça um próximo passo e a indicação de uma aula para revisar.',
    ],
    prompt:
      'Estou na etapa [número] do SLL. Minha dúvida é [explique]. Já tentei [ação] e aconteceu [resultado]. Qual é meu próximo passo? Qual aula devo revisar?',
    lessonSlugs: [],
  },
  'artista-de-loja': {
    title: 'Artista de Loja',
    instructions: [
      'Informe o nome da loja e os tipos de produto que pretende vender.',
      'Conte o estilo, as cores e quem você quer atender.',
      'Peça o logo e uma descrição curta. Revise o nome antes de usar.',
    ],
    prompt:
      'Minha loja se chama [nome]. Vou vender [produtos] para [público]. Quero um estilo [estilo] com as cores [cores]. Ajude a criar o logo e uma descrição curta para minha loja.',
    lessonSlugs: ['configuracoes-essenciais-loja-pos-fornecedor', 'decoracao-da-loja'],
  },
  'fotografo-profissional': {
    title: 'Fotógrafo Profissional',
    instructions: [
      'Envie uma foto real do produto, com boa luz e sem cortes.',
      'Diga a cor, o tamanho e o que precisa aparecer na imagem.',
      'Confira se o resultado preserva as características reais do produto antes de publicar.',
    ],
    prompt:
      'Quero melhorar a foto deste produto: [nome e características]. Preserve a cor, o formato, as proporções e os detalhes reais. Crie uma foto para a vitrine da Shopee com [fundo ou cenário].',
    lessonSlugs: [
      'anuncios-automaticos-fotos',
      'duplicando-anuncios-do-jeito-certo',
      'videos-shopee-videos',
    ],
  },
  'anuncio-lucrativo': {
    title: 'Anúncio Lucrativo',
    instructions: [
      'Informe o produto, as medidas, o material, as variações e os itens incluídos.',
      'Diga para quem o produto serve e quais benefícios ele realmente oferece.',
      'Peça título e descrição. Confira o preço na calculadora SLL antes de cadastrar.',
    ],
    prompt:
      'Crie um título e uma descrição para meu produto na Shopee. Produto: [nome]. Material e medidas: [dados]. Variações: [dados]. Itens incluídos: [dados]. Público e benefícios reais: [dados]. Não invente características. Vou conferir o preço na calculadora SLL.',
    lessonSlugs: ['titulos-descricao-precificacao', 'duplicando-anuncios-do-jeito-certo'],
  },
};

export function resourceHref(resource: { slug: string; destination: string | null }) {
  return resource.destination && Object.hasOwn(ASSISTANT_GUIDES, resource.slug)
    ? `/sll/recursos/assistentes/${resource.slug}`
    : resource.destination;
}
