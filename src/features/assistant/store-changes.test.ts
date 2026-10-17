import { expect, test } from 'bun:test';
import { changeMatches, listingChangeSchema } from './store-changes';

test('confere o conteúdo efetivo antes de conciliar uma resposta perdida', () => {
  expect(
    changeMatches(
      { item_name: 'Novo', description: 'Descrição' },
      { item_id: 12, item_name: 'Novo' },
    ),
  ).toBe(true);
  expect(changeMatches({ item_name: 'Antigo' }, { item_id: 12, item_name: 'Novo' })).toBe(false);
  expect(
    changeMatches(
      { image: { image_id_list: ['one'] } },
      { item_id: 12, image: { image_id_list: ['two'] } },
    ),
  ).toBe(false);
});
test('não cria uma escrita vazia ou permite mudar preço por um campo não previsto', () => {
  expect(listingChangeSchema.safeParse({ item_id: 1 }).success).toBe(false);
  expect(listingChangeSchema.safeParse({ item_id: 1, price: 999 }).success).toBe(false);
});
