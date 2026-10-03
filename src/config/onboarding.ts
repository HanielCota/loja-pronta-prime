/**
 * Conversa inicial da Loja Pronta (fase 1): as perguntas, na ordem em que aparecem. Lista única:
 * a tela, a validação no servidor e a revisão das respostas leem daqui.
 *
 * - `single`: uma opção (botões de rádio); `multi`: até `max` opções (caixas de seleção), em
 *   lista ou em `chips` quando as opções são curtas.
 * - `name`: texto curto, com "Ainda não sei" (a equipe sugere); `color`: uma cor ou "Deixo com a
 *   equipe"; `longtext`: texto livre e opcional.
 * - `label`: nome curto da pergunta na revisão ("Motivação").
 *
 * As respostas guardam o texto da opção escolhida, pra equipe ler sem tradução.
 */

export const ONBOARDING_BLOCKS = {
  voce: 'Sobre você',
  marca: 'Sua marca',
} as const;

export type OnboardingBlock = keyof typeof ONBOARDING_BLOCKS;

type Option = { label: string; description?: string; color?: string };

type BaseQuestion = {
  id: string;
  block: OnboardingBlock;
  ask: string;
  /** Linha abaixo da pergunta, só quando ajuda a responder (ex.: o limite de opções). */
  help?: string;
  label: string;
};

export type OnboardingQuestion =
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

/** Texto da opção "deixo com a equipe" na pergunta da cor. */
export const COLOR_UP_TO_TEAM = 'Deixo com a equipe';

export const ONBOARDING_QUESTIONS = [
  {
    id: 'vendas',
    block: 'voce',
    kind: 'single',
    ask: 'Você já vendeu pela internet?',
    label: 'Já vendeu',
    options: [{ label: 'Nunca vendi' }, { label: 'Já vendi um pouco' }, { label: 'Já vendo hoje' }],
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
      { label: 'Escolher bons produtos' },
      { label: 'Criar bons anúncios' },
      { label: 'Medo de errar' },
      { label: 'Falta de tempo' },
      { label: 'Não sei por onde começar' },
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
    ],
  },
  {
    id: 'tempo',
    block: 'voce',
    kind: 'single',
    ask: 'Quanto tempo por semana você tem pra loja?',
    label: 'Tempo por semana',
    options: [
      { label: 'Até 3 horas' },
      { label: 'De 3 a 7 horas' },
      { label: 'De 7 a 14 horas' },
      { label: 'Mais de 14 horas' },
    ],
  },
  {
    id: 'nome',
    block: 'marca',
    kind: 'name',
    ask: 'Como vai se chamar sua loja?',
    help: 'Se ainda não decidiu, a equipe sugere um nome.',
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
      { label: 'Moderno', description: 'Linhas limpas e diretas' },
      { label: 'Divertido', description: 'Cores e formas alegres' },
      { label: 'Elegante', description: 'Sofisticado e discreto' },
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
      { label: COLOR_UP_TO_TEAM },
    ],
  },
  {
    id: 'sentimento',
    block: 'marca',
    kind: 'multi',
    layout: 'chips',
    max: 3,
    ask: 'Como você quer que as clientes se sintam?',
    help: 'Escolha até 3.',
    label: 'Sentimento',
    options: [
      { label: 'Acolhidas' },
      { label: 'Seguras' },
      { label: 'Alegres' },
      { label: 'Especiais' },
      { label: 'Bem atendidas' },
      { label: 'Inspiradas' },
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
] as const satisfies readonly OnboardingQuestion[];

export type OnboardingQuestionId = (typeof ONBOARDING_QUESTIONS)[number]['id'];

/**
 * Respostas guardadas: o texto da opção (uma ou várias); no nome, `null` = "a equipe sugere";
 * no toque pessoal, texto vazio = pulou. Pergunta sem chave = ainda não respondida.
 */
export type OnboardingAnswers = Partial<Record<OnboardingQuestionId, string | string[] | null>>;

/** Tamanhos máximos dos textos livres. */
export const STORE_NAME_MAX = 60;
export const PERSONAL_TOUCH_MAX = 300;
