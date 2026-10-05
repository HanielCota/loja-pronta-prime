/**
 * Conversa inicial da Loja Pronta (fase 1): as perguntas, na ordem em que aparecem. Lista única:
 * a tela, a validação no servidor e a revisão das respostas leem daqui.
 *
 * - `single`: uma opção (botões de rádio); `multi`: até `max` opções (caixas de seleção), em
 *   lista ou em `chips` quando as opções são curtas.
 * - `name`: texto curto, com "Ainda não sei" (a plataforma sugere nomes na fase da marca);
 *   `color`: uma cor ou "Escolho depois"; `longtext`: texto livre e opcional.
 * - `label`: nome curto da pergunta na revisão ("Motivação").
 *
 * As respostas guardam o texto da opção escolhida (as sugestões da marca leem daqui).
 */

export const ONBOARDING_BLOCKS = {
  voce: 'Sobre você',
  marca: 'Sua marca',
} as const;

type OnboardingBlock = keyof typeof ONBOARDING_BLOCKS;

type Option = { label: string; description?: string; color?: string };

type BaseQuestion = {
  id: string;
  block: OnboardingBlock;
  ask: string;
  /** Linha abaixo da pergunta, só quando ajuda a responder (ex.: o limite de opções). */
  help?: string;
  label: string;
};

/** Formato de uma pergunta na lista (o `id` é qualquer texto aqui; ver OnboardingQuestion). */
type QuestionDefinition =
  | (BaseQuestion & { kind: 'single'; options: readonly Option[] })
  | (BaseQuestion & {
      kind: 'multi';
      options: readonly Option[];
      max: number;
      layout: 'list' | 'chips';
    })
  | (BaseQuestion & { kind: 'name' })
  | (BaseQuestion & { kind: 'color'; options: readonly Option[] })
  | (BaseQuestion & { kind: 'longtext' });

/** Texto da opção "escolho depois" na pergunta da cor (ela escolhe no estúdio do logo). */
const COLOR_LATER = 'Escolho depois';

/** A opção da cor escolhida por ela: a resposta guarda a cor ("#rrggbb"), não este texto. */
export const COLOR_OTHER = 'Outra cor';

/** Uma cor escolhida por ela, no formato que fica guardado ("#rrggbb"). */
export function isCustomColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/.test(value);
}

/** A resposta de quem já tem loja na Shopee: ela pula a criação da conta (fase 3). */
export const SHOPEE_STORE = 'Tenho loja ativa na Shopee';

export const ONBOARDING_QUESTIONS = [
  {
    id: 'vendas',
    block: 'voce',
    kind: 'single',
    ask: 'Você já vendeu pela internet?',
    label: 'Já vendeu',
    options: [
      { label: SHOPEE_STORE, description: 'Já vendo ou já tenho a loja criada lá' },
      { label: 'Vendo em outro lugar', description: 'Instagram, WhatsApp ou outro site' },
      { label: 'Já vendi, mas parei', description: 'Já tive loja, hoje não vendo' },
      { label: 'Nunca vendi', description: 'É a primeira vez' },
    ],
  },
  {
    id: 'motivacao',
    block: 'voce',
    kind: 'multi',
    layout: 'list',
    max: 5,
    ask: 'O que te trouxe até aqui?',
    help: 'Pode marcar mais de uma.',
    label: 'Motivação',
    options: [
      { label: 'Renda extra' },
      { label: 'Não depender de chefe' },
      { label: 'Trabalhar no meu horário' },
      { label: 'Sair do trabalho fixo' },
      { label: 'Ter o meu próprio negócio' },
    ],
  },
  {
    id: 'dificuldade',
    block: 'voce',
    kind: 'single',
    ask: 'O que mais preocupa você hoje?',
    label: 'Maior preocupação',
    options: [
      { label: 'Escolher bons produtos', description: 'Não sei o que vale a pena vender' },
      { label: 'Configurar a Shopee', description: 'Tenho receio da parte técnica da loja' },
      { label: 'Criar bons anúncios', description: 'Título, fotos, descrição e preço' },
      { label: 'Medo de errar', description: 'Quero evitar perder tempo ou dinheiro' },
      { label: 'Falta de tempo', description: 'Preciso de um caminho mais direto' },
      { label: 'Não sei por onde começar', description: 'Quero um passo a passo claro' },
    ],
  },
  {
    id: 'categorias',
    block: 'voce',
    kind: 'multi',
    layout: 'chips',
    max: 3,
    ask: 'Que tipo de produto você gostaria de vender?',
    help: 'Escolha até 3.',
    label: 'Categorias',
    // Lista provisória: as categorias de verdade virão do catálogo de fornecedores (fase 5).
    options: [
      { label: 'Casa e decoração' },
      { label: 'Beleza' },
      { label: 'Moda e acessórios' },
      { label: 'Infantil' },
      { label: 'Pets' },
      { label: 'Cozinha' },
      { label: 'Fitness' },
      { label: 'Papelaria' },
      { label: 'Tecnologia' },
      { label: 'Outros' },
    ],
  },
  {
    id: 'tempo',
    block: 'voce',
    kind: 'single',
    ask: 'Quanto tempo por semana você tem pra loja?',
    label: 'Tempo por semana',
    options: [
      { label: 'Até 3 horas', description: 'Um pouquinho por semana' },
      { label: 'De 3 a 7 horas', description: 'Uma hora por dia, mais ou menos' },
      { label: 'De 7 a 14 horas', description: 'Umas duas horas por dia' },
      { label: 'Mais de 14 horas', description: 'Vou me dedicar bastante' },
    ],
  },
  {
    id: 'nome',
    block: 'marca',
    kind: 'name',
    ask: 'Como vai se chamar sua loja?',
    help: 'Se ainda não decidiu, a gente sugere nomes pra você escolher.',
    label: 'Nome da loja',
  },
  {
    id: 'estilo',
    block: 'marca',
    kind: 'single',
    ask: 'Qual estilo combina com sua marca?',
    label: 'Estilo',
    options: [
      { label: 'Delicado', description: 'Traços suaves e ar acolhedor' },
      { label: 'Elegante', description: 'Sofisticado, que não sai de moda' },
      { label: 'Moderno', description: 'Linhas limpas e diretas' },
      { label: 'Natural', description: 'Orgânico, com cara de natureza' },
      { label: 'Divertido', description: 'Colorido e animado' },
      { label: 'Profissional', description: 'Confiável e sério' },
      { label: 'Artesanal', description: 'Feito à mão, com carinho' },
    ],
  },
  {
    id: 'cor',
    block: 'marca',
    kind: 'color',
    ask: 'Qual é a cor principal da sua marca?',
    label: 'Cor principal',
    options: [
      { label: 'Rosa', color: '#e85d8e' },
      { label: 'Lilás', color: '#9b7bd4' },
      { label: 'Azul', color: '#2f7de1' },
      { label: 'Verde', color: '#3ba776' },
      { label: 'Terracota', color: '#c8643b' },
      { label: 'Preto', color: '#1d1d1f' },
      // "Outra cor": a resposta guarda a cor que ela escolheu ("#rrggbb"), ver isCustomColor.
      { label: COLOR_OTHER },
      { label: COLOR_LATER },
    ],
  },
  {
    id: 'sentimento',
    block: 'marca',
    kind: 'multi',
    layout: 'chips',
    max: 2,
    ask: 'Qual sensação a sua marca deve passar?',
    help: 'Escolha até 2.',
    label: 'Sensação',
    options: [
      { label: 'Confiança' },
      { label: 'Acolhimento' },
      { label: 'Sofisticação' },
      { label: 'Energia' },
      { label: 'Sustentabilidade' },
      { label: 'Diversão' },
      { label: 'Exclusividade' },
      { label: 'Praticidade' },
      { label: 'Delicadeza' },
      { label: 'Inovação' },
    ],
  },
  {
    id: 'toque',
    block: 'marca',
    kind: 'longtext',
    ask: 'Tem algo que não pode faltar na marca?',
    help: 'Um símbolo, uma lembrança ou um nome de família. É opcional.',
    label: 'Toque pessoal',
  },
] as const satisfies readonly QuestionDefinition[];

export type OnboardingQuestionId = (typeof ONBOARDING_QUESTIONS)[number]['id'];

/** Uma pergunta da conversa, com o `id` restrito às perguntas que existem. */
export type OnboardingQuestion = QuestionDefinition & { id: OnboardingQuestionId };

/**
 * Uma resposta guardada: o texto da opção (uma ou várias); no nome, `null` = "ainda não decidi";
 * no toque pessoal, texto vazio = pulou.
 */
export type AnswerValue = string | string[] | null;

/** Respostas guardadas, por pergunta. Pergunta sem chave = ainda não respondida. */
export type OnboardingAnswers = Partial<Record<OnboardingQuestionId, AnswerValue>>;

/** Tamanhos máximos dos textos livres. */
export const STORE_NAME_MAX = 60;
export const PERSONAL_TOUCH_MAX = 300;
