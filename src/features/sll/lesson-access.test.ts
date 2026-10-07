import { expect, test } from 'bun:test';
import { isPlanReferenceAvailable } from './lesson-access';

test('abre apenas a aula de apoio vinculada ao plano que já está disponível', () => {
  const stages = [{ slug: 'etapa-2', isUnlocked: true, relatedLessonIds: ['apoio', null] }];
  expect(isPlanReferenceAvailable(stages, 'apoio')).toBe(true);
  expect(isPlanReferenceAvailable(stages, 'outra-aula')).toBe(false);
  expect(isPlanReferenceAvailable([], 'apoio')).toBe(false);
});

test('não permite referências de etapas fechadas nem de outro tipo de etapa', () => {
  expect(
    isPlanReferenceAvailable(
      [{ slug: 'etapa-2', isUnlocked: false, relatedLessonIds: ['apoio'] }],
      'apoio',
    ),
  ).toBe(false);
  expect(
    isPlanReferenceAvailable(
      [{ slug: 'etapa-1', isUnlocked: true, relatedLessonIds: ['apoio'] }],
      'apoio',
    ),
  ).toBe(false);
});
