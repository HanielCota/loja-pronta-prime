import { describe, expect, it } from 'bun:test';
import { filterLibraryModules, type LibraryModule } from './library-search';

const modules: LibraryModule[] = [
  {
    id: '1',
    title: 'Sua vitrine',
    lessons: [
      { id: 'a', title: 'Avaliações da loja', description: null, completed: true },
      { id: 'b', title: 'Anúncios', description: 'Criar um cupom de desconto.', completed: false },
    ],
  },
  {
    id: '2',
    title: 'Logística',
    lessons: [{ id: 'c', title: 'Envios', description: 'Imprimir etiquetas.', completed: false }],
  },
  { id: '3', title: 'Em preparação', lessons: [] },
];

describe('busca da biblioteca do SLL', () => {
  it('encontra títulos sem acentos, ignorando maiúsculas e espaços nas pontas', () => {
    expect(filterLibraryModules(modules, '  AVALIACOES  ')[0]?.lessons.map((l) => l.id)).toEqual([
      'a',
    ]);
  });
  it('busca também na descrição e na categoria', () => {
    expect(filterLibraryModules(modules, 'cupom')[0]?.lessons.map((l) => l.id)).toEqual(['b']);
    expect(filterLibraryModules(modules, 'logistica')[0]?.lessons.map((l) => l.id)).toEqual(['c']);
    expect(filterLibraryModules(modules, 'vitrine')[0]?.lessons.map((l) => l.id)).toEqual([
      'a',
      'b',
    ]);
  });
  it('mantém a ordem e a conclusão sem alterar o catálogo original', () => {
    const original = structuredClone(modules);
    const results = filterLibraryModules(modules, '');
    expect(results.map((m) => m.id)).toEqual(['1', '2']);
    expect(results[0]?.lessons[0]?.completed).toBe(true);
    expect(modules).toEqual(original);
  });
  it('não deixa categorias vazias quando não há resultado', () => {
    expect(filterLibraryModules(modules, 'inexistente')).toEqual([]);
  });
});
