import {
  COLOR_OTHER,
  isCustomColor,
  ONBOARDING_QUESTIONS,
  PERSONAL_TOUCH_MAX,
  type OnboardingAnswers,
  type OnboardingQuestion,
  type OnboardingQuestionId,
} from '@/config/onboarding';

/** Respostas da conversa: validação do que chega do formulário, limpeza e texto da revisão. */

export function isAnswered(answers: OnboardingAnswers, id: OnboardingQuestionId): boolean {
  return Object.hasOwn(answers, id);
}

/** A resposta como texto, pra revisão. */
export function answerText(question: OnboardingQuestion, answers: OnboardingAnswers): string {
  const value = answers[question.id];
  if (question.kind === 'longtext' && !value) return 'Nada em especial';
  if (question.kind === 'color' && isCustomColor(value)) return 'A cor que você escolheu';
  if (Array.isArray(value)) return value.join(', ');
  return value ?? '';
}

/**
 * Respostas que ainda valem com a lista de perguntas atual. Uma opção que saiu ou mudou de nome
 * deixa de contar: na escolha múltipla, só ela sai; se não
 * sobrar nada, a pergunta volta a ficar sem resposta e a conversa pede de novo. Categorias
 * antigas ficam no banco, mas não alimentam sugestões sem um catálogo confirmado do fornecedor.
 */
export function cleanAnswers(answers: OnboardingAnswers): OnboardingAnswers {
  const clean: OnboardingAnswers = {};
  for (const question of ONBOARDING_QUESTIONS) {
    const id = question.id;
    if (!isAnswered(answers, id)) continue;
    const value = answers[id];
    if (!('options' in question)) {
      if (typeof value === 'string') clean[id] = value;
      continue;
    }
    const labels: string[] = question.options.map((option) => option.label);
    if (question.kind === 'multi') {
      const kept = Array.isArray(value) ? value.filter((item) => labels.includes(item)) : [];
      if (kept.length > 0) clean[id] = kept.slice(0, question.max);
    } else if (question.kind === 'color' && isCustomColor(value)) {
      clean[id] = value;
    } else if (typeof value === 'string' && labels.includes(value) && value !== COLOR_OTHER) {
      clean[id] = value;
    }
  }
  return clean;
}

/**
 * O nome da loja que ela escreveu na conversa, quando a conversa ainda perguntava (a pergunta saiu:
 * o nome é escolhido na marca). Fica fora das respostas, só pra tela do nome da marca começar com
 * ele: quem respondeu e ainda não chegou na marca não perde o que escreveu.
 */
export function legacyStoreName(answers: unknown): string | null {
  if (typeof answers !== 'object' || answers === null || !('nome' in answers)) return null;
  const { nome } = answers;
  return typeof nome === 'string' && nome.trim() ? nome.trim() : null;
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
    case 'color': {
      // "Outra cor" manda a cor escolhida ("#rrggbb"), não o nome da opção.
      const value = values[0]?.toLowerCase();
      if (isCustomColor(value)) return { ok: true, value };
      if (values[0] === COLOR_OTHER) return { ok: false, error: 'Escolha a sua cor.' };
      if (!values[0] || !labels.includes(values[0]))
        return { ok: false, error: 'Escolha uma opção.' };
      return { ok: true, value: values[0] };
    }
    case 'single': {
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
