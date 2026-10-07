import { expect, test } from 'bun:test';
import { splitPlanModules } from './plan-modules';

test('mantém todas as ações obrigatórias do dia e todas as opcionais, inclusive fora do módulo padrão', () => {
  const result = splitPlanModules([
    {
      id: 'dia',
      slug: 'dia-1',
      title: 'Dia 1',
      lessons: [
        { id: 'a', countsTowardProgress: true },
        { id: 'b', countsTowardProgress: true },
        { id: 'c', countsTowardProgress: false },
      ],
    },
    {
      id: 'extra',
      slug: 'acoes-complementares',
      title: 'Ações complementares',
      lessons: [
        { id: 'd', countsTowardProgress: true },
        { id: 'e', countsTowardProgress: false },
      ],
    },
  ]);
  expect(result.requiredModules.map((module) => module.lessons.map((lesson) => lesson.id))).toEqual(
    [['a', 'b'], ['d']],
  );
  expect(result.optionalLessons.map((lesson) => lesson.id)).toEqual(['c', 'e']);
});

test('preserva dias em preparação sem criar um dia vazio para ações complementares', () => {
  const result = splitPlanModules([
    { id: 'dia', slug: 'dia-1', title: 'Dia 1', lessons: [] },
    {
      id: 'extra',
      slug: 'acoes-complementares',
      title: 'Ações complementares',
      lessons: [{ countsTowardProgress: false }],
    },
  ]);
  expect(result.requiredModules.map((module) => module.id)).toEqual(['dia']);
  expect(result.optionalLessons).toHaveLength(1);
});
