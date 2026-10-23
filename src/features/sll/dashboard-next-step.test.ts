import { describe, expect, test } from 'bun:test';
import { chooseSllNextStep, type SllPathStepInput } from './dashboard-next-step';

const allOpen: SllPathStepInput[] = [
  { id: 'welcome', href: '/sll/aula/a' },
  { id: 'method', href: '/sll/metodo' },
  { id: 'courses', href: '/sll/cursos' },
];

describe('chooseSllNextStep', () => {
  test('quem não começou vê as boas-vindas pra começar', () => {
    expect(chooseSllNextStep(allOpen, { completed: 0, total: 6 })).toEqual({
      id: 'welcome',
      href: '/sll/aula/a',
      mode: 'start',
    });
  });

  test('quem já assistiu uma parte continua as boas-vindas', () => {
    expect(chooseSllNextStep(allOpen, { completed: 2, total: 6 })?.mode).toBe('continue');
  });

  test('boas-vindas concluídas levam ao método', () => {
    expect(chooseSllNextStep(allOpen, { completed: 6, total: 6 })).toEqual({
      id: 'method',
      href: '/sll/metodo',
      mode: 'open',
    });
  });

  test('sem método publicado, o próximo é o que estiver aberto', () => {
    const steps: SllPathStepInput[] = [
      { id: 'welcome', href: '/sll/aula/a' },
      { id: 'method', href: null },
      { id: 'courses', href: '/sll/cursos' },
    ];
    expect(chooseSllNextStep(steps, { completed: 6, total: 6 })?.id).toBe('courses');
  });

  test('terminou tudo o que existe: as boas-vindas ficam pra rever', () => {
    const steps: SllPathStepInput[] = [
      { id: 'welcome', href: '/sll/aula/a' },
      { id: 'method', href: null },
      { id: 'courses', href: null },
    ];
    expect(chooseSllNextStep(steps, { completed: 6, total: 6 })?.mode).toBe('review');
  });

  test('sem boas-vindas publicadas, abre o primeiro passo disponível', () => {
    const steps: SllPathStepInput[] = [
      { id: 'welcome', href: null },
      { id: 'method', href: '/sll/metodo' },
      { id: 'courses', href: null },
    ];
    expect(chooseSllNextStep(steps, null)?.id).toBe('method');
  });

  test('nada publicado: sem destaque', () => {
    const steps: SllPathStepInput[] = [
      { id: 'welcome', href: null },
      { id: 'method', href: null },
      { id: 'courses', href: null },
    ];
    expect(chooseSllNextStep(steps, null)).toBeNull();
  });

  test('link vazio conta como em breve e não esconde o passo seguinte', () => {
    const steps: SllPathStepInput[] = [
      { id: 'welcome', href: '' },
      { id: 'method', href: '' },
      { id: 'courses', href: '/sll/cursos' },
    ];
    expect(chooseSllNextStep(steps, { completed: 6, total: 6 })).toEqual({
      id: 'courses',
      href: '/sll/cursos',
      mode: 'open',
    });
  });

  test('progresso inválido não conclui as boas-vindas e manda começar', () => {
    expect(chooseSllNextStep(allOpen, { completed: Number.NaN, total: 6 })?.mode).toBe('start');
    expect(chooseSllNextStep(allOpen, { completed: -1, total: 6 })?.mode).toBe('start');
    expect(chooseSllNextStep(allOpen, { completed: 6, total: Number.NaN })?.id).toBe('welcome');
  });
});
