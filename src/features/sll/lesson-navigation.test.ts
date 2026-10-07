import { expect, test } from 'bun:test';
import {
  getAdjacentSllLessons,
  sllLessonHref,
  sllLibraryLessonHref,
  sllLibraryReturnHref,
} from './lesson-navigation';

test('boas-vindas conservam a aula selecionada no endereço da trilha', () => {
  expect(sllLessonHref('welcome', 'aula-3')).toBe('/sll/comece-aqui?aula=aula-3');
});

test('método e cursos conservam as rotas de aula existentes', () => {
  expect(sllLessonHref('method', 'aula-3')).toBe('/sll/aula/aula-3');
  expect(sllLessonHref('complementary_course', 'aula-3')).toBe('/sll/aula/aula-3');
});

test('aula aberta pelo plano conserva o caminho de retorno interno', () => {
  expect(sllLessonHref('method', 'aula-3', '/sll/metodo/etapa/etapa-2')).toBe(
    '/sll/aula/aula-3?voltar=%2Fsll%2Fmetodo%2Fetapa%2Fetapa-2',
  );
  expect(sllLibraryLessonHref('etapa-3', 'aula-3', 'categoria-1', 'avaliações')).toBe(
    '/sll/aula/aula-3?voltar=%2Fsll%2Fmetodo%2Fetapa%2Fetapa-3%3Fq%3Davalia%25C3%25A7%25C3%25B5es%23library-lesson-categoria-1-aula-3',
  );
  expect(
    sllLibraryReturnHref(
      '/sll/metodo/etapa/etapa-3?q=avaliações#library-lesson-categoria-1-aula-3',
      'categoria-2',
      'aula-4',
    ),
  ).toBe('/sll/metodo/etapa/etapa-3?q=avaliações#library-lesson-categoria-2-aula-4');
});

test('o identificador não pode acrescentar parâmetros ou outro destino', () => {
  expect(sllLessonHref('welcome', 'aula&next=https://example.com')).toBe(
    '/sll/comece-aqui?aula=aula%26next%3Dhttps%3A%2F%2Fexample.com',
  );
});

test('a sequência atravessa o fim de um passo sem calcular pelo número da aula', () => {
  expect(
    getAdjacentSllLessons(
      [
        { id: 'aula-1', moduleId: 'passo-1' },
        { id: 'aula-2', moduleId: 'passo-1' },
        { id: 'aula-3', moduleId: 'passo-2' },
      ],
      'aula-2',
    ),
  ).toEqual({
    previous: { id: 'aula-1', moduleId: 'passo-1', crossesModule: false },
    next: { id: 'aula-3', moduleId: 'passo-2', crossesModule: true },
  });
});

test('aula fora da lista não recebe vizinhos inventados', () => {
  expect(getAdjacentSllLessons([{ id: 'aula-1', moduleId: 'passo-1' }], 'ausente')).toEqual({
    previous: null,
    next: null,
  });
});
