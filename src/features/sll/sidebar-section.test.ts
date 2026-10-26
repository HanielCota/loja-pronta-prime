import { describe, expect, test } from 'bun:test';
import { sllSidebarSection } from './sidebar-section';

const stages = [
  { href: '/sll/metodo/etapa/stage-1', lessonIds: ['lesson-a', 'lesson-b'] },
  { href: '/sll/metodo/etapa/stage-2', lessonIds: ['lesson-c'] },
];

describe('sllSidebarSection', () => {
  test('páginas do menu marcam o próprio endereço', () => {
    expect(sllSidebarSection('/sll/plano', stages)).toBe('/sll/plano');
    expect(sllSidebarSection('/sll/minhas-lojas/conectar', stages)).toBe(
      '/sll/minhas-lojas/conectar',
    );
  });

  test('aula do Método marca a etapa que tem a aula', () => {
    expect(sllSidebarSection('/sll/aula/lesson-c', stages)).toBe('/sll/metodo/etapa/stage-2');
  });

  test('aula fora do Método marca Cursos', () => {
    expect(sllSidebarSection('/sll/aula/lesson-z', stages)).toBe('/sll/cursos');
  });

  test('endereço de aula sem a aula continua sendo o próprio endereço', () => {
    expect(sllSidebarSection('/sll/aula/', stages)).toBe('/sll/aula/');
  });
});
