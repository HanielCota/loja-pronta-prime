/**
 * Temas e situações do chamado guiado (tema → situação → pergunta). Os ids são estáveis: o
 * Desempenho, o FAQ e o mapa do WhatsApp dependem deles. O admin muda rótulos, perguntas, ordem e
 * prioridade em Configurações; os valores daqui são os de fábrica, gravados no banco na primeira
 * leitura (ver `server/catalog.ts`).
 */

import type { ProductId } from '@/config/products';

export const SUPPORT_TICKET_TOPICS = [
  'access',
  'lessons',
  'store',
  'shipping',
  'payment',
  'ombudsman',
  'other',
] as const;
export type SupportTicketTopic = (typeof SUPPORT_TICKET_TOPICS)[number];

export type SituationPriority = 'normal' | 'high';
export type TicketQueue = 'general' | 'ombudsman';

export type SupportSituation = {
  id: string;
  label: string;
  /** Uma linha embaixo do rótulo, quando ajuda a escolher. */
  legend: string | null;
  priority: SituationPriority;
  question: string;
  example: string;
  attachmentTip: string;
  /** Aviso antes de enviar (ex.: o que já dá pra fazer sozinha). */
  notice: string | null;
  active: boolean;
};

export type SupportTopic = {
  id: SupportTicketTopic;
  label: string;
  question: string;
  example: string;
  queue: TicketQueue;
  /** Dinheiro e Ouvidoria vão sempre pra uma pessoa: o FAQ não responde. */
  alwaysHuman: boolean;
  defaultAssigneeId: string | null;
  active: boolean;
  situations: SupportSituation[];
};

/** Quem escolhe "Outro problema" cai aqui: reaproveita a pergunta do tema. */
export const OTHER_ISSUE_ID = 'other-issue';

type SituationSeed = Omit<SupportSituation, 'active' | 'legend' | 'notice' | 'attachmentTip'> &
  Partial<Pick<SupportSituation, 'legend' | 'notice' | 'attachmentTip'>>;

function situation(seed: SituationSeed): SupportSituation {
  return {
    legend: null,
    notice: null,
    attachmentTip: 'Um print da tela onde aparece o problema.',
    active: true,
    ...seed,
  };
}

export const DEFAULT_SUPPORT_CATALOG: readonly SupportTopic[] = [
  {
    id: 'access',
    label: 'Entrar na plataforma',
    question: 'O que acontece quando você tenta entrar?',
    example: 'Digito meu email e senha e aparece "senha incorreta", mas tenho certeza da senha.',
    queue: 'general',
    alwaysHuman: false,
    defaultAssigneeId: null,
    active: true,
    situations: [
      situation({
        id: 'cant-login',
        label: 'Não consigo entrar',
        priority: 'high',
        question: 'O que aparece quando você tenta entrar?',
        example: 'Aparece "email ou senha incorretos", mesmo depois de trocar a senha.',
      }),
      situation({
        id: 'reset-link',
        label: 'O link de senha não funciona',
        priority: 'normal',
        question: 'O que acontece quando você abre o link?',
        example: 'O link abre, mas diz que expirou.',
        notice: 'O link de senha vale por 1 hora. Se passou disso, peça um novo em "Esqueci minha senha".',
      }),
      situation({
        id: 'email-not-confirmed',
        label: 'Não confirmei meu e-mail',
        priority: 'normal',
        question: 'Você recebeu o e-mail de confirmação?',
        example: 'Não chegou nada, nem no spam.',
      }),
      situation({
        id: 'product-missing',
        label: 'Comprei e não aparece',
        priority: 'high',
        question: 'O que você comprou e com qual e-mail?',
        example: 'Comprei a Loja Pronta ontem com o e-mail maria@exemplo.com e ela não aparece.',
        attachmentTip: 'O comprovante da compra.',
      }),
      situation({
        id: 'access-expiring',
        label: 'Meu acesso vai acabar',
        priority: 'normal',
        question: 'O que você quer saber sobre o seu acesso?',
        example: 'Meu acesso acaba semana que vem. Como faço pra continuar?',
      }),
    ],
  },
  {
    id: 'lessons',
    label: 'Aulas do curso',
    question: 'Qual aula e o que está acontecendo?',
    example: 'Etapa 2, aula 5: não entendi como escolher a categoria.',
    queue: 'general',
    alwaysHuman: false,
    defaultAssigneeId: null,
    active: true,
    situations: [
      situation({
        id: 'video-not-loading',
        label: 'A aula não carrega',
        priority: 'normal',
        question: 'Qual aula e o que aparece na tela?',
        example: 'Etapa 2, aula 5: a tela fica preta e o vídeo não começa.',
        attachmentTip: 'Um print da tela da aula.',
      }),
      situation({
        id: 'stage-locked',
        label: 'Uma etapa não abriu',
        priority: 'normal',
        question: 'Qual etapa está fechada?',
        example: 'Terminei a etapa 1, mas a etapa 2 continua com cadeado.',
      }),
      situation({
        id: 'lesson-question',
        label: 'Dúvida sobre o conteúdo',
        priority: 'normal',
        question: 'Qual aula e qual é a sua dúvida?',
        example: 'Aula de precificação: não entendi como calcular a margem.',
        attachmentTip: 'Um print da parte da aula, se ajudar.',
      }),
      situation({
        id: 'material',
        label: 'Material ou calculadora',
        priority: 'normal',
        question: 'Qual material ou calculadora, e o que acontece?',
        example: 'A calculadora de preço mostra um valor negativo.',
      }),
    ],
  },
  {
    id: 'store',
    label: 'Minha Loja Pronta',
    question: 'Em que parte da loja você precisa de ajuda?',
    example: 'Quero trocar o nome da minha marca.',
    queue: 'general',
    alwaysHuman: false,
    defaultAssigneeId: null,
    active: true,
    situations: [
      situation({
        id: 'brand',
        label: 'Nome, logo ou texto da marca',
        priority: 'normal',
        question: 'O que você quer ajustar na marca?',
        example: 'O logo ficou com o nome cortado.',
      }),
      situation({
        id: 'logo-limit',
        label: 'Acabaram as criações de logo',
        priority: 'normal',
        question: 'O que aconteceu com os seus logos?',
        example: 'Usei as 4 criações e nenhum logo ficou bom.',
      }),
      situation({
        id: 'shopee-account',
        label: 'Conta na Shopee',
        priority: 'normal',
        question: 'Em que passo da conta na Shopee você está?',
        example: 'A Shopee pede um documento que eu não tenho.',
      }),
      situation({
        id: 'phase-waiting',
        label: 'Quando abre a próxima fase',
        priority: 'normal',
        question: 'Qual fase você está esperando?',
        example: 'Terminei a fase 3 e a fase 4 aparece "em breve".',
        notice: 'O painel da loja mostra o que já está liberado. As próximas fases aparecem como "em breve" até abrirem.',
      }),
    ],
  },
  {
    id: 'shipping',
    label: 'Envio Velox',
    question: 'Qual é a sua dúvida sobre o envio?',
    example: 'Não sei por onde começar a usar o Envio Velox.',
    queue: 'general',
    alwaysHuman: false,
    defaultAssigneeId: null,
    active: true,
    situations: [
      situation({
        id: 'how-to-start',
        label: 'Como começar a usar',
        priority: 'normal',
        question: 'Em que passo você parou?',
        example: 'Assisti a aula, mas não sei onde me cadastrar.',
      }),
      situation({
        id: 'label-or-tracking',
        label: 'Etiqueta ou rastreio',
        priority: 'normal',
        question: 'O que acontece com a etiqueta ou o rastreio?',
        example: 'A etiqueta saiu sem o código de rastreio.',
        attachmentTip: 'Um print da etiqueta ou do rastreio.',
      }),
      situation({
        id: 'shipping-question',
        label: 'Dúvida da aula de envio',
        priority: 'normal',
        question: 'Qual aula e qual é a dúvida?',
        example: 'Na aula 13, não entendi como calcular o frete.',
      }),
    ],
  },
  {
    id: 'payment',
    label: 'Pagamento e reembolso',
    question: 'O que aconteceu com o pagamento?',
    example: 'Fui cobrada duas vezes no cartão.',
    queue: 'general',
    alwaysHuman: true,
    defaultAssigneeId: null,
    active: true,
    situations: [
      situation({
        id: 'refund',
        label: 'Quero reembolso',
        priority: 'normal',
        question: 'Qual produto e por que você quer o reembolso?',
        example: 'Comprei o SLL há 3 dias e não é o que eu esperava.',
      }),
      situation({
        id: 'unknown-charge',
        label: 'Cobrança que não reconheço',
        priority: 'high',
        question: 'Qual cobrança, em que data e de que valor?',
        example: 'Apareceu uma cobrança de R$ 97,00 no dia 20 que eu não fiz.',
        attachmentTip: 'Um print da fatura, sem o número do cartão.',
      }),
      situation({
        id: 'invoice',
        label: 'Nota fiscal',
        priority: 'normal',
        question: 'De qual compra você precisa da nota?',
        example: 'Preciso da nota fiscal da compra da Loja Pronta.',
      }),
    ],
  },
  {
    id: 'ombudsman',
    label: 'Ouvidoria',
    question: 'Conte o que aconteceu.',
    example: 'Abri um chamado há uma semana e ninguém respondeu.',
    queue: 'ombudsman',
    alwaysHuman: true,
    defaultAssigneeId: null,
    active: true,
    situations: [],
  },
  {
    id: 'other',
    label: 'Outra coisa',
    question: 'Conte o que está acontecendo.',
    example: 'Quero saber se dá pra mudar o e-mail da minha conta.',
    queue: 'general',
    alwaysHuman: false,
    defaultAssigneeId: null,
    active: true,
    situations: [],
  },
];

/**
 * As situações que a aluna vê: as ativas e, quando o tema tem alguma, "Outro problema" no fim
 * (com a pergunta e o exemplo do tema).
 */
export function visibleSituations(topic: SupportTopic): SupportSituation[] {
  const active = topic.situations.filter((item) => item.active);
  if (active.length === 0) return [];
  return [
    ...active,
    {
      id: OTHER_ISSUE_ID,
      label: 'Outro problema',
      legend: 'Não está na lista acima',
      priority: 'normal',
      question: topic.question,
      example: topic.example,
      attachmentTip: 'Um print da tela onde aparece o problema.',
      notice: null,
      active: true,
    },
  ];
}

/**
 * De qual produto é cada tema. `null` vale pros dois (acesso, pagamento, Ouvidoria, outra coisa).
 * O Envio Velox é conteúdo do SLL.
 */
export const TOPIC_PRODUCT: Readonly<Record<SupportTicketTopic, ProductId | null>> = {
  access: null,
  lessons: 'sll',
  store: 'loja-pronta',
  shipping: 'sll',
  payment: null,
  ombudsman: null,
  other: null,
};

function topicProduct(topicId: string): ProductId | null {
  return TOPIC_PRODUCT[topicId as SupportTicketTopic] ?? null;
}

/**
 * Os temas que a aluna pode escolher: os dos produtos que ela tem e os que valem pros dois.
 * Sem produto nenhum (acesso vencido, equipe testando), mostra tudo pra não deixar ninguém sem saída.
 */
export function topicsForProducts(
  catalog: readonly SupportTopic[],
  owned: readonly ProductId[],
): SupportTopic[] {
  if (owned.length === 0) return [...catalog];
  return catalog.filter((topic) => {
    const product = topicProduct(topic.id);
    return product === null || owned.includes(product);
  });
}

/**
 * O produto gravado no chamado, pra fila separar SLL de Loja Pronta. Vale, nesta ordem: a aula ou
 * a fase que veio junto, o produto do tema e, nos temas dos dois, o único produto da aluna.
 */
export function ticketProduct(input: {
  topicId: string;
  lessonId: string | null;
  storePhase: number | null;
  owned: readonly ProductId[];
}): ProductId | null {
  if (input.lessonId) return 'sll';
  if (input.storePhase) return 'loja-pronta';
  const fromTopic = topicProduct(input.topicId);
  if (fromTopic) return fromTopic;
  return input.owned.length === 1 ? (input.owned[0] ?? null) : null;
}

export function findTopic(
  catalog: readonly SupportTopic[],
  topicId: string,
): SupportTopic | undefined {
  return catalog.find((topic) => topic.id === topicId && topic.active);
}

export function findSituation(topic: SupportTopic, situationId: string): SupportSituation | undefined {
  return visibleSituations(topic).find((item) => item.id === situationId);
}

/** O rótulo de tema + situação gravados num chamado ("Aulas do curso · A aula não carrega"). */
export function describeTopic(
  catalog: readonly SupportTopic[],
  topicId: string,
  situationId: string | null,
): { topic: string; situation: string | null } {
  const topic = catalog.find((item) => item.id === topicId);
  if (!topic) return { topic: 'Outra coisa', situation: null };
  if (!situationId) return { topic: topic.label, situation: null };
  if (situationId === OTHER_ISSUE_ID) return { topic: topic.label, situation: 'Outro problema' };
  const found = topic.situations.find((item) => item.id === situationId);
  return { topic: topic.label, situation: found?.label ?? null };
}
