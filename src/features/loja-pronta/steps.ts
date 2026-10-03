import {
  ONBOARDING_QUESTIONS,
  type OnboardingAnswers,
  type OnboardingQuestion,
  type OnboardingQuestionId,
} from '@/config/onboarding';
import { isAnswered } from './answers';

/**
 * Etapas da conversa, na ordem: as perguntas, a revisão e o WhatsApp. Cada etapa é uma página
 * (`/loja-pronta/conversa/<etapa>`), com formulário de verdade: funciona sem JavaScript e,
 * como cada resposta é salva, ela continua de onde parou.
 */
export const REVIEW_STEP = 'revisao';
export const WHATSAPP_STEP = 'whatsapp';
export const CONVERSATION_PATH = '/loja-pronta/conversa';
export const DONE_PATH = `${CONVERSATION_PATH}/pronto`;

export type Step = OnboardingQuestionId | typeof REVIEW_STEP | typeof WHATSAPP_STEP;

const QUESTION_IDS: OnboardingQuestionId[] = ONBOARDING_QUESTIONS.map((question) => question.id);
export const STEPS: Step[] = [...QUESTION_IDS, REVIEW_STEP, WHATSAPP_STEP];

export function stepPath(step: Step, { editing = false } = {}): string {
  return `${CONVERSATION_PATH}/${step}${editing ? '?editar=1' : ''}`;
}

const STEP_SET: ReadonlySet<string> = new Set(STEPS);

export function isStep(value: string): value is Step {
  return STEP_SET.has(value);
}

export function findQuestion(step: Step): OnboardingQuestion | undefined {
  return ONBOARDING_QUESTIONS.find((question) => question.id === step);
}

/** Primeira pergunta sem resposta, ou a revisão quando todas foram respondidas. */
export function resumeStep(answers: OnboardingAnswers): Step {
  return QUESTION_IDS.find((id) => !isAnswered(answers, id)) ?? REVIEW_STEP;
}

/**
 * Até onde ela pode ir: as perguntas já respondidas e a primeira sem resposta; a revisão e o
 * WhatsApp só com todas respondidas.
 */
export function canOpen(step: Step, answers: OnboardingAnswers): boolean {
  const resume = resumeStep(answers);
  if (resume === REVIEW_STEP) return true;
  return STEPS.indexOf(step) <= STEPS.indexOf(resume);
}

export function nextStep(step: Step): Step {
  return STEPS[STEPS.indexOf(step) + 1] ?? WHATSAPP_STEP;
}

/** Onde o "voltar" leva: a etapa anterior (da primeira, a área da Loja Pronta). */
export function previousPath(step: Step, { editing = false } = {}): string {
  if (editing) return stepPath(REVIEW_STEP);
  const previous = STEPS[STEPS.indexOf(step) - 1];
  return previous ? stepPath(previous) : '/loja-pronta';
}

/** Número da pergunta (1 a 10), pra "Pergunta 3 de 10". */
function questionNumber(step: Step): number {
  return QUESTION_IDS.findIndex((id) => id === step) + 1;
}

export const QUESTION_COUNT = QUESTION_IDS.length;

/** Nome da etapa, pro título da aba: "Pergunta 3 de 10", "Revisão", "Último passo". */
export function stepTitle(step: Step): string {
  if (step === REVIEW_STEP) return 'Revisão';
  if (step === WHATSAPP_STEP) return 'Último passo';
  return `Pergunta ${questionNumber(step)} de ${QUESTION_COUNT}`;
}

/**
 * O topo de cada etapa: o que está escrito ("Pergunta 3 de 10"), quantos tracinhos da barra já
 * estão cheios (contando a etapa atual) e se já há respostas salvas. Sem nome de parte e sem
 * número solto: "8 de 10" não diz 8 de quê, e "Sua marca" se confundia com a fase da marca.
 * `hasAnswers`: se já tem alguma resposta salva (vale também na pergunta 1, quando ela volta da
 * revisão ou retoma a conversa).
 */
export function stepHeader(step: Step, hasAnswers: boolean): StepHeader {
  const total = QUESTION_COUNT;
  if (step === REVIEW_STEP)
    return { label: 'Revisão das respostas', filled: total, total, saved: true };
  if (step === WHATSAPP_STEP) return { label: 'Último passo', filled: total, total, saved: true };
  const number = questionNumber(step);
  const label =
    number === total
      ? 'Última pergunta'
      : number === total - 1
        ? `Pergunta ${number} de ${total} · falta só 1`
        : `Pergunta ${number} de ${total}`;
  return { label, filled: number, total, saved: hasAnswers };
}

export type StepHeader = {
  label: string;
  /** Tracinhos cheios na barra (a etapa atual conta). */
  filled: number;
  total: number;
  /** Já tem resposta salva: o topo avisa, pra ela sair sem medo de perder. */
  saved: boolean;
};
