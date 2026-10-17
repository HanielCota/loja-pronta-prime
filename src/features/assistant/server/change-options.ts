import { z } from 'zod';
import { assertAssistantAccess } from './metrics';
import { readShopeeAccess } from '@/features/shopee/server/connection';
import { readShopeeResource } from '@/features/shopee/server/resources';

export async function listingChangeOptions(userId: string, categoryId?: number) {
  const config = await assertAssistantAccess(userId, 'sll');
  const access = await readShopeeAccess(userId, config);
  const categories = await readShopeeResource(
    config,
    access,
    '/api/v2/product/get_category',
    z.object({
      category_list: z.array(
        z.object({
          category_id: z.number().int().positive().safe(),
          original_category_name: z.string(),
          has_children: z.boolean(),
        }),
      ),
    }),
    { language: 'pt-br' },
  );
  const attributes = categoryId
    ? await readShopeeResource(
        config,
        access,
        '/api/v2/product/get_attributes',
        z.object({
          attribute_list: z.array(
            z.object({
              attribute_id: z.number().int().positive().safe(),
              original_attribute_name: z.string(),
              is_mandatory: z.boolean(),
              attribute_value_list: z
                .array(
                  z.object({
                    value_id: z.number().int().nonnegative().safe(),
                    original_value_name: z.string(),
                  }),
                )
                .default([]),
            }),
          ),
        }),
        { category_id: String(categoryId), language: 'pt-br' },
      )
    : { attribute_list: [] };
  return {
    categories: categories.category_list.filter((row) => !row.has_children),
    attributes: attributes.attribute_list,
  };
}
