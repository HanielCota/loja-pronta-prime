import { describe, expect, test } from 'bun:test';
import { parseStaffFilters, staffFilterHref } from './filters';

describe('filtros da fila', () => {
  test('lê os filtros e descarta valor estranho', () => {
    const filters = parseStaffFilters(
      new URLSearchParams('fila=atrasados&status=open&prioridade=alta&tema=lessons&produto=sll&pagina=2&q=  aula  '),
      false,
    );
    expect(filters).toMatchObject({
      queue: 'atrasados',
      status: 'open',
      priority: '',
      topic: 'lessons',
      product: 'sll',
      page: 2,
      q: 'aula',
    });
  });

  test('quem não cuida da Ouvidoria cai em Todos', () => {
    expect(parseStaffFilters(new URLSearchParams('fila=ouvidoria'), false).queue).toBe('todos');
    expect(parseStaffFilters(new URLSearchParams('fila=ouvidoria'), true).queue).toBe('ouvidoria');
  });

  test('produto estranho vira vazio', () => {
    expect(parseStaffFilters(new URLSearchParams('produto=outro'), false).product).toBe('');
  });

  test('página inválida volta pra 1', () => {
    expect(parseStaffFilters(new URLSearchParams('pagina=-3'), false).page).toBe(1);
    expect(parseStaffFilters(new URLSearchParams('pagina=abc'), false).page).toBe(1);
  });

  test('trocar um filtro volta pra primeira página', () => {
    expect(staffFilterHref(new URLSearchParams('fila=minha&pagina=3'), { status: 'open' })).toBe(
      '/admin/chamados?fila=minha&status=open',
    );
    expect(staffFilterHref(new URLSearchParams('fila=minha'), { pagina: '2' })).toBe(
      '/admin/chamados?fila=minha&pagina=2',
    );
    expect(staffFilterHref(new URLSearchParams('fila=minha'), { fila: '' })).toBe('/admin/chamados');
  });
});
