import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ShopeeConfiguration } from '@/features/shopee/authorization';
import { readShopeeResource } from '@/features/shopee/server/resources';
import type { PublicationContext } from '../publication';

const id = z.number().int().positive().safe();
type Access = { shopId: number; accessToken: string };
const label = (
  row: { display_name?: string | undefined; original_name?: string | undefined },
  fallback: string,
) => row.display_name || row.original_name || fallback;

/** Read-only marketplace metadata. This step never uploads images or creates a listing. */
export async function recoveredPublicationOptions(
  config: ShopeeConfiguration,
  access: Access,
  fetcher: typeof fetch = fetch,
): Promise<PublicationContext> {
  const shop = await readShopeeResource(
    config,
    access,
    '/api/v2/shop/get_shop_info',
    z.object({
      shop_name: z.string().min(1),
      region: z.literal('BR'),
      status: z.literal('NORMAL'),
    }),
    {},
    fetcher,
  );
  const categories = await readShopeeResource(
    config,
    access,
    '/api/v2/product/get_category',
    z.object({
      category_list: z.array(
        z.object({
          category_id: id,
          parent_category_id: z.number().optional(),
          has_children: z.boolean(),
          display_category_name: z.string().optional(),
          original_category_name: z.string().optional(),
        }),
      ),
    }),
    { language: 'pt-BR' },
    fetcher,
  );
  const channels = await readShopeeResource(
    config,
    access,
    '/api/v2/logistics/get_channel_list',
    z.object({
      logistics_channel_list: z.array(
        z.object({
          logistics_channel_id: id,
          enabled: z.boolean(),
          logistics_channel_name: z.string().min(1),
          fee_type: z.string().optional(),
        }),
      ),
    }),
    {},
    fetcher,
  );
  const names = new Map(categories.category_list.map((row) => [row.category_id, row]));
  return {
    version: randomUUID(),
    shopName: shop.shop_name,
    categories: categories.category_list
      .filter((row) => !row.has_children)
      .map((row) => {
        const path: string[] = [];
        const seen = new Set<number>();
        let current: typeof row | undefined = row;
        while (current && !seen.has(current.category_id)) {
          seen.add(current.category_id);
          path.unshift(
            label(
              {
                display_name: current.display_category_name,
                original_name: current.original_category_name,
              },
              `Categoria ${current.category_id}`,
            ),
          );
          current = names.get(current.parent_category_id ?? 0);
        }
        return { id: row.category_id, name: path.join(' / ') };
      })
      .toSorted((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    channels: channels.logistics_channel_list
      .filter(
        (row) => row.enabled && !['CUSTOM_PRICE', 'SIZE_SELECTION'].includes(row.fee_type ?? ''),
      )
      .map((row) => ({ id: row.logistics_channel_id, name: row.logistics_channel_name })),
    attributes: [],
    brands: [],
  };
}

type RawAttribute = {
  attribute_id: number;
  mandatory: boolean;
  name: string;
  attribute_value_list: { value_id: number; name: string; child_attribute_list: RawAttribute[] }[];
  attribute_info?:
    { input_type: number; input_validation_type: number; format_type: number } | undefined;
};
const attributeSchema: z.ZodType<RawAttribute> = z.lazy(() =>
  z.object({
    attribute_id: id,
    mandatory: z.boolean(),
    name: z.string().min(1),
    attribute_value_list: z
      .array(
        z.object({
          value_id: z.number().int().nonnegative().safe(),
          name: z.string().min(1),
          child_attribute_list: z.array(attributeSchema).default([]),
        }),
      )
      .default([]),
    attribute_info: z
      .object({
        input_type: z.number().int(),
        input_validation_type: z.number().int(),
        format_type: z.number().int(),
      })
      .optional(),
  }),
);

export async function recoveredCategoryOptions(
  config: ShopeeConfiguration,
  access: Access,
  context: PublicationContext,
  categoryId: number,
  fetcher: typeof fetch = fetch,
): Promise<PublicationContext> {
  if (!context.categories.some((row) => row.id === categoryId))
    throw new Error('Categoria indisponível.');
  const attributes = await readShopeeResource(
    config,
    access,
    '/api/v2/product/get_attribute_tree',
    z.object({
      list: z.array(z.object({ category_id: id, attribute_tree: z.array(attributeSchema) })),
    }),
    { category_id_list: String(categoryId), language: 'pt-BR' },
    fetcher,
  );
  const tree = attributes.list.find((row) => row.category_id === categoryId);
  if (!tree) throw new Error('Categoria indisponível.');
  const range = z.object({
    min_limit: z.number().nonnegative(),
    max_limit: z.number().nonnegative(),
  });
  const limits = await readShopeeResource(
    config,
    access,
    '/api/v2/product/get_item_limit',
    z.object({
      price_limit: range,
      stock_limit: range,
      item_name_length_limit: range,
      item_description_length_limit: range,
      item_image_count_limit: range,
      gtin_limit: z.object({ gtin_validation_rule: z.enum(['Mandatory', 'Flexible', 'Optional']) }),
      size_chart_limit: z.object({ size_chart_mandatory: z.boolean() }).optional(),
    }),
    { category_id: String(categoryId) },
    fetcher,
  );
  const unsupported: string[] = [];
  if (limits.size_chart_limit?.size_chart_mandatory)
    unsupported.push(
      'A Shopee exige uma tabela de medidas nesta categoria. Complete a publicação na Central do Vendedor.',
    );
  if (!context.channels.length)
    unsupported.push(
      'Nenhum frete compatível está disponível para sua loja. Confira os fretes na Central do Vendedor.',
    );
  const flattened: PublicationContext['attributes'] = [];
  const flatten = (
    nodes: RawAttribute[],
    dependencies: { attributeId: number; valueId: number }[] = [],
    depth = 0,
  ) => {
    if (depth > 8 || flattened.length > 1000) throw new Error('Atributos indisponíveis.');
    for (const node of nodes) {
      const info = node.attribute_info;
      flattened.push({
        id: node.attribute_id,
        name: node.name,
        mandatory: node.mandatory,
        dependencies,
        supported:
          !info ||
          (info.format_type !== 2 &&
            info.input_validation_type !== 4 &&
            [1, 2, 3, 4, 5].includes(info.input_type)),
        numeric: info ? [1, 3].includes(info.input_validation_type) : false,
        values: node.attribute_value_list.map((value) => ({
          id: value.value_id,
          name: value.name,
        })),
      });
      for (const value of node.attribute_value_list)
        flatten(
          value.child_attribute_list,
          [...dependencies, { attributeId: node.attribute_id, valueId: value.value_id }],
          depth + 1,
        );
    }
  };
  flatten(tree.attribute_tree);
  const brands: PublicationContext['brands'] = [{ id: 0, name: 'Sem marca' }];
  for (let offset = 0; ; offset += 100) {
    if (offset >= 10_000) throw new Error('A lista de marcas precisa de conferência.');
    const page = await readShopeeResource(
      config,
      access,
      '/api/v2/product/get_brand_list',
      z.object({
        brand_list: z.array(
          z.object({
            brand_id: z.number().int().nonnegative().safe(),
            original_brand_name: z.string().min(1),
          }),
        ),
        has_next_page: z.boolean(),
      }),
      { category_id: String(categoryId), offset: String(offset), page_size: '100', status: '1' },
      fetcher,
    );
    brands.push(
      ...page.brand_list
        .filter((brand) => brand.brand_id !== 0)
        .map((row) => ({ id: row.brand_id, name: row.original_brand_name })),
    );
    if (!page.has_next_page) break;
  }
  return {
    ...context,
    version: randomUUID(),
    categoryId,
    brands,
    unsupported,
    limits: {
      title: {
        min: limits.item_name_length_limit.min_limit,
        max: limits.item_name_length_limit.max_limit,
      },
      description: {
        min: limits.item_description_length_limit.min_limit,
        max: limits.item_description_length_limit.max_limit,
      },
      price: { min: limits.price_limit.min_limit, max: limits.price_limit.max_limit },
      stock: { min: limits.stock_limit.min_limit, max: limits.stock_limit.max_limit },
      images: {
        min: limits.item_image_count_limit.min_limit,
        max: limits.item_image_count_limit.max_limit,
      },
      gtin: limits.gtin_limit.gtin_validation_rule,
    },
    attributes: flattened,
  };
}
