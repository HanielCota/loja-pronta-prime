import { describe, expect, test } from 'bun:test';
import { DEFAULT_SUPPORT_CATALOG, ticketProduct, topicsForProducts } from './catalog';

const ids = (topics: readonly { id: string }[]) => topics.map((topic) => topic.id);

describe('temas por produto', () => {
  test('quem tem só o SLL não vê a Loja Pronta', () => {
    expect(ids(topicsForProducts(DEFAULT_SUPPORT_CATALOG, ['sll']))).toEqual([
      'access',
      'lessons',
      'shipping',
      'payment',
      'ombudsman',
      'other',
    ]);
  });

  test('quem tem só a Loja Pronta não vê as aulas nem o Envio Velox', () => {
    expect(ids(topicsForProducts(DEFAULT_SUPPORT_CATALOG, ['loja-pronta']))).toEqual([
      'access',
      'store',
      'payment',
      'ombudsman',
      'other',
    ]);
  });

  test('quem tem os dois, ou nenhum, vê todos', () => {
    const all = ids(DEFAULT_SUPPORT_CATALOG);
    expect(ids(topicsForProducts(DEFAULT_SUPPORT_CATALOG, ['sll', 'loja-pronta']))).toEqual(all);
    expect(ids(topicsForProducts(DEFAULT_SUPPORT_CATALOG, []))).toEqual(all);
  });
});

describe('produto do chamado', () => {
  const base = { lessonId: null, storePhase: null, owned: ['sll', 'loja-pronta'] as const };

  test('a aula e a fase decidem primeiro', () => {
    expect(ticketProduct({ ...base, topicId: 'other', lessonId: 'aula' })).toBe('sll');
    expect(ticketProduct({ ...base, topicId: 'other', storePhase: 3 })).toBe('loja-pronta');
  });

  test('depois vale o tema', () => {
    expect(ticketProduct({ ...base, topicId: 'lessons' })).toBe('sll');
    expect(ticketProduct({ ...base, topicId: 'shipping' })).toBe('sll');
    expect(ticketProduct({ ...base, topicId: 'store' })).toBe('loja-pronta');
  });

  test('tema dos dois usa o único produto da aluna', () => {
    expect(ticketProduct({ ...base, topicId: 'payment', owned: ['sll'] })).toBe('sll');
    expect(ticketProduct({ ...base, topicId: 'payment' })).toBeNull();
    expect(ticketProduct({ ...base, topicId: 'access', owned: [] })).toBeNull();
  });
});
