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
 * Linha logo abaixo da pergunta: a ajuda dela ou a instrução de selecionar e confirmar no botão.
 */
export function questionHelp(question: OnboardingQuestion, editing: boolean): string | undefined {
  const action = editing ? 'Salvar e voltar' : 'Continuar';
  if (question.help) return `${question.help} Quando terminar, toque em ${action}.`;
  if (question.kind === 'single' || question.kind === 'color') {
    return `Escolha uma opção e toque em ${action}.`;
  }
  return undefined;
}

/** Nota fixa abaixo do campo de texto livre: quanto texto ainda cabe. Sem nota: vazio. */
export function fieldNote(question: OnboardingQuestion, draft: Draft): string {
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
    // Na edição do campo opcional, salvar sem texto ainda é a ação principal.
    ready: question.kind === 'longtext' ? editing || !empty : !missingAnswer(question, draft),
    label: editing ? 'Salvar e voltar' : empty ? 'Pular' : 'Continuar',
  };
}
