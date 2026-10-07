import { describe, expect, it } from 'bun:test';
import { getSllStageCardState } from './stage-card-state';

const base = {
  completedCount: 0,
  totalCount: 6,
  publishedLessonCount: 6,
  isComplete: false,
  isUnlocked: true,
  lockMessage: null,
};

describe('estado do cartão da etapa', () => {
  it('começa quando há conteúdo publicado e nenhum progresso', () => {
    expect(getSllStageCardState(base)).toMatchObject({
      kind: 'available',
      action: 'start',
      actionLabel: 'Começar etapa',
      showProgress: true,
    });
  });

  it('continua quando há progresso parcial', () => {
    expect(getSllStageCardState({ ...base, completedCount: 2 })).toMatchObject({
      kind: 'available',
      action: 'continue',
      actionLabel: 'Continuar etapa',
    });
  });

  it('revisa somente quando todas as ações obrigatórias terminam', () => {
    expect(getSllStageCardState({ ...base, completedCount: 6, isComplete: true })).toMatchObject({
      kind: 'complete',
      action: 'review',
      actionLabel: 'Revisar etapa',
    });
  });

  it('mantém uma etapa bloqueada sem oferecer destino', () => {
    expect(
      getSllStageCardState({
        ...base,
        isUnlocked: false,
        lockMessage: 'Conclua Etapa 1 para abrir Etapa 2.',
      }),
    ).toMatchObject({
      kind: 'locked',
      action: null,
      message: 'Conclua Etapa 1 para abrir Etapa 2.',
      showProgress: false,
    });
  });

  it('diferencia conteúdo não publicado de bloqueio', () => {
    expect(
      getSllStageCardState({ ...base, publishedLessonCount: 0, isUnlocked: false }),
    ).toMatchObject({ kind: 'preparing', action: null, showProgress: false });
  });
});
