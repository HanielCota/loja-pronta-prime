import { describe, expect, test } from 'bun:test';
import { shopeeItemListPageSchema } from './item-list';

describe('Shopee item list page', () => {
  test('a page without the item field means no listings', () => {
    expect(shopeeItemListPageSchema.parse({ has_next_page: false, next_offset: 0 }).item).toEqual(
      [],
    );
    expect(shopeeItemListPageSchema.parse({ item: [], has_next_page: false }).item).toEqual([]);
  });

  test('keeps real items and rejects broken pages', () => {
    expect(
      shopeeItemListPageSchema.parse({ item: [{ item_id: 7 }], has_next_page: true }).item,
    ).toEqual([{ item_id: 7 }]);
    expect(shopeeItemListPageSchema.safeParse({ item: null, has_next_page: false }).success).toBe(
      false,
    );
    expect(shopeeItemListPageSchema.safeParse({ item: [] }).success).toBe(false);
    for (const item_id of [0, -1, NaN, Infinity, 1.5, '7'])
      expect(
        shopeeItemListPageSchema.safeParse({ item: [{ item_id }], has_next_page: false }).success,
      ).toBe(false);
  });
});
