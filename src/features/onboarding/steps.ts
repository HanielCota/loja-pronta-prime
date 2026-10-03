import {
  ONBOARDING_QUESTIONS,
  PERSONAL_TOUCH_MAX,
  STORE_NAME_MAX,
  type OnboardingAnswers,
  type OnboardingQuestion,
  type OnboardingQuestionId,
} from '@/config/onboarding';

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

export function isStep(value: string): value is Step {
  return (STEPS as string[]).includes(value);
}

export function findQuestion(step: Step): OnboardingQuestion | undefined {
  return ONBOARDING_QUESTIONS.find((question) => question.id === step);
}

export function isAnswered(answers: OnboardingAnswers, id: OnboardingQuestionId): boolean {
  return Object.hasOwn(answers, id);
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
export function questionNumber(step: Step): number {
  return QUESTION_IDS.indexOf(step as OnboardingQuestionId) + 1;
}

export const QUESTION_COUNT = QUESTION_IDS.length;

/**
 * Onde a etapa fica no topo: a parte (Sobre você, Sua marca, Confirmar), pro nome em cima, e
 * quanto da conversa inteira já foi, contando a etapa atual (a 1ª de 12 enche um doze avos).
 */
export function stepProgress(step: Step): { part: 0 | 1 | 2; progress: number } {
  const progress = (STEPS.indexOf(step) + 1) / STEPS.length;
  if (step === REVIEW_STEP || step === WHATSAPP_STEP) return { part: 2, progress };
  return { part: findQuestion(step)?.block === 'marca' ? 1 : 0, progress };
}

/** A resposta como texto, pra revisão. */
export function answerText(question: OnboardingQuestion, answers: OnboardingAnswers): string {
  const value = answers[question.id as OnboardingQuestionId];
  if (question.kind === 'name' && value === null) return `${UNKNOWN_NAME} (a equipe sugere)`;
  if (question.kind === 'longtext' && !value) return 'Nada em especial';
  if (Array.isArray(value)) return value.join(', ');
  return value ?? '';
}

/** Texto da opção "não sei o nome" (no formulário, no erro e na revisão). */
export const UNKNOWN_NAME = 'Ainda não decidi';

/**
 * Respostas que ainda valem com a lista de perguntas atual. Uma opção que saiu ou mudou de nome
 * (a lista de categorias é provisória) deixa de contar: na escolha múltipla, só ela sai; se não
 * sobrar nada, a pergunta volta a ficar sem resposta e a conversa pede de novo.
 */
export function cleanAnswers(answers: OnboardingAnswers): OnboardingAnswers {
  const clean: OnboardingAnswers = {};
  for (const question of ONBOARDING_QUESTIONS) {
    const id = question.id;
    if (!isAnswered(answers, id)) continue;
    const value = answers[id];
    if (!('options' in question)) {
      const textOk = typeof value === 'string' || (question.kind === 'name' && value === null);
      if (textOk) clean[id] = value;
      continue;
    }
    const labels: string[] = question.options.map((option) => option.label);
    if (question.kind === 'multi') {
      const kept = Array.isArray(value) ? value.filter((item) => labels.includes(item)) : [];
      if (kept.length > 0) clean[id] = kept.slice(0, question.max);
    } else if (typeof value === 'string' && labels.includes(value)) {
      clean[id] = value;
    }
  }
  return clean;
}

export type ParsedAnswer =
  { ok: true; value: string | string[] | null } | { ok: false; error: string };

/**
 * Lê e confere a resposta enviada pelo formulário (`value`, e `unknown` no nome). A regra fica no
 * servidor: uma Server Action pode ser chamada direto, com qualquer valor.
 */
export function parseAnswer(question: OnboardingQuestion, formData: FormData): ParsedAnswer {
  const values = formData
    .getAll('value')
    .filter((value): value is string => typeof value === 'string');
  const labels = 'options' in question ? question.options.map((option) => option.label) : [];

  switch (question.kind) {
    case 'single':
    case 'color': {
      const [value] = values;
      if (!value || !labels.includes(value)) return { ok: false, error: 'Escolha uma opção.' };
      return { ok: true, value };
    }
    case 'multi': {
      const unique = [...new Set(values)];
      if (unique.length === 0 || !unique.every((value) => labels.includes(value))) {
        return { ok: false, error: 'Escolha pelo menos uma opção.' };
      }
      if (unique.length > question.max) {
        return { ok: false, error: `Escolha no máximo ${question.max}.` };
      }
      // Na ordem das opções, não na ordem em que foram marcadas.
      return { ok: true, value: labels.filter((label) => unique.includes(label)) };
    }
    case 'name': {
      if (formData.get('unknown')) return { ok: true, value: null };
      const name = (values[0] ?? '').trim().replace(/\s+/g, ' ');
      if (!name) {
        return { ok: false, error: `Escreva o nome da loja ou marque "${UNKNOWN_NAME}".` };
      }
      if (name.length > STORE_NAME_MAX) {
        return { ok: false, error: `Use no máximo ${STORE_NAME_MAX} caracteres.` };
      }
      return { ok: true, value: name };
    }
    case 'longtext': {
      // O navegador envia quebra de linha como CRLF (2 caracteres), mas o maxLength do campo
      // conta 1: sem normalizar, um texto que o campo aceitou seria recusado aqui.
      const text = (values[0] ?? '').replace(/\r\n?/g, '\n').trim();
      if (text.length > PERSONAL_TOUCH_MAX) {
        return { ok: false, error: `Use no máximo ${PERSONAL_TOUCH_MAX} caracteres.` };
      }
      return { ok: true, value: text };
    }
  }
}

/** WhatsApp brasileiro com DDD: só os dígitos (10 ou 11), sem o 55 do país. */
export function parseWhatsapp(input: string): string | undefined {
  let digits = input.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10 && digits.length !== 11) return undefined;
  if (digits.startsWith('0')) return undefined;
  return digits;
}

/** (11) 98765-4321 */
export function formatWhatsapp(digits: string): string {
  const area = digits.slice(0, 2);
  const rest = digits.slice(2);
  const split = rest.length === 9 ? 5 : 4;
  return `(${area}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}
