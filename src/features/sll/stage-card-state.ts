export type SllStageCardInput = {
  completedCount: number;
  totalCount: number;
  publishedLessonCount: number;
  isComplete: boolean;
  isUnlocked: boolean;
  lockMessage: string | null;
};

export type SllStageCardState = {
  kind: 'preparing' | 'locked' | 'available' | 'complete';
  action: 'start' | 'continue' | 'review' | null;
  actionLabel: 'Começar etapa' | 'Continuar etapa' | 'Revisar etapa' | null;
  message: string;
  showProgress: boolean;
};

/** Centraliza a leitura da etapa para o cartão e a URL direta usarem os mesmos estados. */
export function getSllStageCardState({
  completedCount,
  totalCount,
  publishedLessonCount,
  isComplete,
  isUnlocked,
  lockMessage,
}: SllStageCardInput): SllStageCardState {
  if (publishedLessonCount === 0) {
    return {
      kind: 'preparing',
      action: null,
      actionLabel: null,
      message:
        'Esta etapa ainda está em preparação. As aulas aparecerão aqui quando forem publicadas.',
      showProgress: false,
    };
  }

  if (!isUnlocked) {
    return {
      kind: 'locked',
      action: null,
      actionLabel: null,
      message: lockMessage ?? 'Conclua a etapa anterior para abrir esta etapa.',
      showProgress: false,
    };
  }

  if (isComplete && totalCount > 0) {
    return {
      kind: 'complete',
      action: 'review',
      actionLabel: 'Revisar etapa',
      message: `${completedCount} de ${totalCount} ações obrigatórias concluídas.`,
      showProgress: totalCount > 0,
    };
  }

  const hasProgress = completedCount > 0;
  return {
    kind: 'available',
    action: hasProgress ? 'continue' : 'start',
    actionLabel: hasProgress ? 'Continuar etapa' : 'Começar etapa',
    message:
      totalCount > 0
        ? `${completedCount} de ${totalCount} ações obrigatórias concluídas.`
        : 'Conteúdo disponível para você começar no seu ritmo.',
    showProgress: totalCount > 0,
  };
}
