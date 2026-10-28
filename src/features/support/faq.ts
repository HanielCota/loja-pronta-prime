/**
 * O assistente do suporte: uma resposta automática mostrada antes de o chamado chegar a uma
 * pessoa. Hoje a fonte é o FAQ curado (tabela `support_faq_answers`); o tipo já deixa espaço pra
 * uma IA no futuro, sem mudar quem chama. Dinheiro, Ouvidoria e compra que não aparece vão sempre
 * pra uma pessoa.
 */

export type SupportAnswerLink = { label: string; path: string };

export type SupportAnswer = {
  id: string;
  topicId: string;
  situationId: string | null;
  title: string;
  steps: string[];
  links: SupportAnswerLink[];
  active: boolean;
};

export type SupportNeedsHumanReason = 'always_human' | 'no_match' | 'not_configured' | 'failed';

export type SupportAssistantResult =
  | { kind: 'answer'; answer: SupportAnswer }
  | { kind: 'needs_human'; reason: SupportNeedsHumanReason };

export type SupportAssistantQuestion = {
  topicId: string;
  situationId: string | null;
  alwaysHuman: boolean;
};

export const SUPPORT_ASSISTANT_PROVIDERS = ['faq'] as const;

const ALWAYS_HUMAN_SITUATIONS: ReadonlySet<string> = new Set(['access:product-missing']);

/** Páginas que uma resposta pode indicar: só caminhos internos que existem. */
export const FAQ_LINK_PATHS = [
  '/recuperar-senha',
  '/perfil',
  '/perfil#suporte',
  '/loja-pronta',
  '/sll',
] as const;

export function isAllowedFaqPath(path: string): boolean {
  return (FAQ_LINK_PATHS as readonly string[]).includes(path);
}

export function alwaysNeedsHuman(question: SupportAssistantQuestion): boolean {
  if (question.alwaysHuman) return true;
  return ALWAYS_HUMAN_SITUATIONS.has(`${question.topicId}:${question.situationId ?? ''}`);
}

/** A resposta do FAQ pra situação escolhida (a da situação vence a do tema todo). */
export function answerFromFaq(
  answers: readonly SupportAnswer[],
  question: SupportAssistantQuestion,
): SupportAssistantResult {
  if (alwaysNeedsHuman(question)) return { kind: 'needs_human', reason: 'always_human' };
  const active = answers.filter((answer) => answer.active && answer.topicId === question.topicId);
  const exact = active.find((answer) => answer.situationId === question.situationId);
  const general = active.find((answer) => answer.situationId === null);
  const answer = exact ?? (question.situationId ? undefined : general);
  if (!answer) return { kind: 'needs_human', reason: 'no_match' };
  return { kind: 'answer', answer };
}

export const DEFAULT_FAQ_ANSWERS: readonly SupportAnswer[] = [
  {
    id: 'reset-link-expired',
    topicId: 'access',
    situationId: 'reset-link',
    title: 'Peça um link novo',
    steps: [
      'O link de senha vale por 1 hora e só funciona uma vez.',
      'Abra "Esqueci minha senha" e peça um link novo com o e-mail da compra.',
      'Não chegou? Olhe o spam e a aba Promoções.',
    ],
    links: [{ label: 'Pedir um link novo', path: '/recuperar-senha' }],
    active: true,
  },
  {
    id: 'email-confirmation',
    topicId: 'access',
    situationId: 'email-not-confirmed',
    title: 'Confira o spam e peça de novo',
    steps: [
      'O e-mail de confirmação pode cair no spam ou na aba Promoções.',
      'Se não achar, peça um link de senha: ele também confirma o seu e-mail.',
    ],
    links: [{ label: 'Pedir um link', path: '/recuperar-senha' }],
    active: true,
  },
  {
    id: 'video-not-loading',
    topicId: 'lessons',
    situationId: 'video-not-loading',
    title: 'Tente estes passos antes',
    steps: [
      'Atualize a página da aula.',
      'Teste em outro navegador, como o Chrome.',
      'Desligue bloqueadores de anúncio pra este site.',
      'Confira se a internet está funcionando em outro site.',
    ],
    links: [{ label: 'Voltar pro curso', path: '/sll' }],
    active: true,
  },
  {
    id: 'stage-locked',
    topicId: 'lessons',
    situationId: 'stage-locked',
    title: 'As etapas abrem em ordem',
    steps: [
      'Cada etapa abre quando você termina as aulas da etapa anterior.',
      'Marque como assistidas as aulas que faltam na etapa anterior.',
    ],
    links: [{ label: 'Abrir o curso', path: '/sll' }],
    active: true,
  },
  {
    id: 'logo-limit',
    topicId: 'store',
    situationId: 'logo-limit',
    title: 'Use um logo enviado por você',
    steps: [
      'Cada conta tem 4 criações de logo.',
      'Você ainda pode enviar até 10 logos prontos, feitos por você ou por alguém.',
    ],
    links: [{ label: 'Abrir a minha loja', path: '/loja-pronta' }],
    active: true,
  },
  {
    id: 'phase-waiting',
    topicId: 'store',
    situationId: 'phase-waiting',
    title: 'O painel mostra o que já está liberado',
    steps: [
      'As fases abrem uma de cada vez.',
      'As próximas aparecem como "em breve" até abrirem pra todo mundo.',
    ],
    links: [{ label: 'Abrir a minha loja', path: '/loja-pronta' }],
    active: true,
  },
];
