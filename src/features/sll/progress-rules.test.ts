import { describe, expect, it } from 'bun:test';
import {
  isProgressId,
  parseProgressLocation,
  parseProgressPosition,
  resolveSequentialStageAccess,
  summarizeTrackProgress,
  undoCompletionMessage,
  type LessonProgressRecord,
} from './progress-rules';

const lessons = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('progresso da trilha', () => {
  it('confere os identificadores e o ponto do vídeo', () => {
    expect(isProgressId('44408d11-f282-4a43-9949-8b3c44b94ee4')).toBe(true);
    expect(isProgressId('fora')).toBe(false);
    expect(
      parseProgressLocation(
        '44408d11-f282-4a43-9949-8b3c44b94ee4',
        'e29efc3c-8334-48d6-8b74-ebcb11affab8',
      ),
    ).not.toBeNull();
    expect(parseProgressLocation('fora', 'e29efc3c-8334-48d6-8b74-ebcb11affab8')).toBeNull();
    expect(parseProgressPosition(73)).toBe(73);
    expect(parseProgressPosition(-1)).toBeNull();
    expect(parseProgressPosition(2.5)).toBeNull();
    expect(parseProgressPosition(86_401)).toBeNull();
  });

  it('conta aulas concluídas e retoma a aula atual no ponto salvo', () => {
    const progress: LessonProgressRecord[] = [
      { lessonId: 'a', completedAt: new Date(), lastPositionSeconds: 0, lastViewedAt: new Date() },
      { lessonId: 'b', completedAt: null, lastPositionSeconds: 73, lastViewedAt: new Date() },
    ];
    expect(summarizeTrackProgress(lessons, progress, 'b')).toMatchObject({
      completedCount: 1,
      totalCount: 3,
      resumeLessonId: 'b',
      resumePositionSeconds: 73,
    });
  });

  it('volta para a primeira aula pendente quando a última foi concluída', () => {
    const progress: LessonProgressRecord[] = [
      { lessonId: 'a', completedAt: null, lastPositionSeconds: 18, lastViewedAt: new Date() },
      { lessonId: 'b', completedAt: new Date(), lastPositionSeconds: 0, lastViewedAt: new Date() },
    ];
    expect(summarizeTrackProgress(lessons, progress, 'b')).toMatchObject({
      completedCount: 1,
      resumeLessonId: 'a',
      resumePositionSeconds: 18,
    });
  });

  it('começa pela primeira aula incompleta e lida com trilha vazia', () => {
    expect(summarizeTrackProgress(lessons, [], null).resumeLessonId).toBe('a');
    expect(summarizeTrackProgress([], [], null)).toMatchObject({
      completedCount: 0,
      totalCount: 0,
      resumeLessonId: null,
      resumePositionSeconds: 0,
    });
  });

  it('ao concluir tudo, mantém a última aula como destino', () => {
    const progress = lessons.map(({ id }) => ({
      lessonId: id,
      completedAt: new Date(),
      lastPositionSeconds: 0,
      lastViewedAt: new Date(),
    }));
    expect(summarizeTrackProgress(lessons, progress, 'b').resumeLessonId).toBe('c');
  });

  it('mantém ações opcionais fora da contagem do progresso', () => {
    const progress: LessonProgressRecord[] = [
      { lessonId: 'a', completedAt: new Date(), lastPositionSeconds: 0, lastViewedAt: new Date() },
      { lessonId: 'b', completedAt: null, lastPositionSeconds: 0, lastViewedAt: null },
      { lessonId: 'c', completedAt: null, lastPositionSeconds: 0, lastViewedAt: null },
    ];
    expect(
      summarizeTrackProgress(
        [{ id: 'a' }, { id: 'b' }, { id: 'c', countsTowardProgress: false }],
        progress,
        null,
      ),
    ).toMatchObject({ completedCount: 1, totalCount: 2, resumeLessonId: 'b' });
  });
});

describe('desbloqueio das etapas do método', () => {
  it('libera a etapa seguinte só quando todas as aulas da etapa anterior terminam', () => {
    expect(
      resolveSequentialStageAccess([
        {
          id: 'etapa-1',
          title: 'Etapa 1',
          lessons: [{ completed: true }, { completed: false }],
        },
        { id: 'etapa-2', title: 'Etapa 2', lessons: [{ completed: false }] },
        { id: 'etapa-3', title: 'Etapa 3', lessons: [{ completed: false }] },
      ]),
    ).toMatchObject([
      { isUnlocked: true, isComplete: false, completedCount: 1, totalCount: 2 },
      {
        isUnlocked: false,
        isComplete: false,
        lockMessage: 'Conclua Etapa 1 para abrir Etapa 2.',
      },
      { isUnlocked: false, lockMessage: 'Conclua Etapa 2 para abrir Etapa 3.' },
    ]);
  });

  it('não marca uma etapa vazia como concluída, mas ela não trava as seguintes', () => {
    expect(
      resolveSequentialStageAccess([
        { id: 'etapa-1', title: 'Etapa 1', lessons: [] },
        { id: 'etapa-2', title: 'Etapa 2', lessons: [{ completed: false }] },
      ]),
    ).toMatchObject([
      { isUnlocked: true, isComplete: false, totalCount: 0 },
      { isUnlocked: true, lockMessage: null },
    ]);
  });

  it('pula a etapa vazia ao decidir o bloqueio', () => {
    expect(
      resolveSequentialStageAccess([
        { id: 'etapa-1', title: 'Etapa 1', lessons: [{ completed: false }] },
        { id: 'etapa-2', title: 'Etapa 2', lessons: [] },
        { id: 'etapa-3', title: 'Etapa 3', lessons: [{ completed: false }] },
      ]),
    ).toMatchObject([
      { isUnlocked: true },
      { isUnlocked: false, lockMessage: 'Conclua Etapa 1 para abrir Etapa 2.' },
      { isUnlocked: false, lockMessage: 'Conclua Etapa 1 para abrir Etapa 3.' },
    ]);
  });
});

describe('desfazer a conclusão de uma aula', () => {
  const before = [
    { stageId: 'etapa-1', title: 'Primeiros passos', isUnlocked: true },
    { stageId: 'etapa-2', title: 'Sua vitrine', isUnlocked: true },
    { stageId: 'etapa-3', title: 'Vendas', isUnlocked: true },
  ];

  it('sem etapa fechada, só confirma', () => {
    expect(undoCompletionMessage(before, before)).toBe('A conclusão da aula foi desfeita.');
  });

  it('avisa a etapa que fechou de novo', () => {
    expect(
      undoCompletionMessage(before, [
        { stageId: 'etapa-1', isUnlocked: true },
        { stageId: 'etapa-2', isUnlocked: true },
        { stageId: 'etapa-3', isUnlocked: false },
      ]),
    ).toBe(
      'A conclusão da aula foi desfeita. A etapa “Vendas” fechou de novo. Marque esta aula como concluída pra abrir outra vez.',
    );
  });

  it('conta as etapas quando mais de uma fecha', () => {
    expect(
      undoCompletionMessage(before, [
        { stageId: 'etapa-1', isUnlocked: true },
        { stageId: 'etapa-2', isUnlocked: false },
        { stageId: 'etapa-3', isUnlocked: false },
      ]),
    ).toContain('2 etapas fecharam de novo.');
  });

  it('não fala de etapa que já estava fechada', () => {
    expect(
      undoCompletionMessage(
        [...before.slice(0, 2), { stageId: 'etapa-3', title: 'Vendas', isUnlocked: false }],
        [
          { stageId: 'etapa-1', isUnlocked: true },
          { stageId: 'etapa-2', isUnlocked: true },
          { stageId: 'etapa-3', isUnlocked: false },
        ],
      ),
    ).toBe('A conclusão da aula foi desfeita.');
  });
});
