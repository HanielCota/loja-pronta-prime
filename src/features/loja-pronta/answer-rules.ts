import { PERSONAL_TOUCH_MAX, type OnboardingQuestion } from '@/config/onboarding';
import { UNKNOWN_NAME } from './answers';

/** O que ela marcou ou escreveu na pergunta, antes de enviar. */
export type Draft = { selected: string[]; unknownName: boolean; text: string };

/** Pergunta incompleta: o aviso a mostrar. Respondida (ou opcional): nada. */
export function missingAnswer(question: OnboardingQuestion, draft: Draft): string | undefined {
  switch (question.kind) {
    case 'single':
    case 'color':
      return draft.selected.length ? undefined : 'Escolha uma opção.';
    case 'multi':
      return draft.selected.length ? undefined : 'Escolha pelo menos uma opção.';
    case 'name':
      return draft.unknownName || draft.text.trim()
        ? undefined
        : `Escreva o nome da loja ou marque "${UNKNOWN_NAME}".`;
    case 'longtext':
      return undefined;
  }
}

/** Escolha única: tocar na opção já envia. */
export function advancesOnTap(question: OnboardingQuestion): boolean {
  return question.kind === 'single' || question.kind === 'color';
}

/** Máximo de opções marcadas (1 nas de escolha única). */
export function maxChoices(question: OnboardingQuestion): number {
  return question.kind === 'multi' ? question.max : 1;
}

/**
 * Contador da escolha múltipla. Com limite menor que o número de opções, avisa quando chega nele
 * (as outras travam); nos chips, mostra quantas já foram.
 */
export function choiceCounter(question: OnboardingQuestion, selected: number): string {
  if (question.kind !== 'multi') return '';
  const { max } = question;
  if (max < question.options.length && selected >= max) {
    return `Você escolheu ${max} de ${max}. Pra trocar, desmarque uma.`;
  }
  return question.layout === 'chips' ? `${selected} de ${max} escolhidas` : '';
}

/**
 * Nota fixa abaixo do campo: o aviso de que tocar já segue (WCAG 3.2.2: avisar antes de mudar
 * de página) ou quanto texto ainda cabe. Sem nota: vazio.
 */
export function fieldNote(question: OnboardingQuestion, draft: Draft, editing: boolean): string {
  if (advancesOnTap(question)) {
    return editing
      ? 'Ao tocar numa opção, você volta pra revisão.'
      : 'Ao tocar numa opção, você segue pra próxima pergunta.';
  }
  if (question.kind === 'longtext') {
    return `${draft.text.length} de ${PERSONAL_TOUCH_MAX} caracteres`;
  }
  return '';
}

/** O botão: azul quando há resposta (cinza, mas clicável, antes) e o texto dele. */
export function submitButton(
  question: OnboardingQuestion,
  draft: Draft,
  editing: boolean,
): { ready: boolean; label: string } {
  const empty = question.kind === 'longtext' && !draft.text.trim();
  return {
    ready: question.kind === 'longtext' ? !empty : !missingAnswer(question, draft),
    label: editing ? 'Salvar e voltar' : empty ? 'Pular' : 'Continuar',
  };
}
