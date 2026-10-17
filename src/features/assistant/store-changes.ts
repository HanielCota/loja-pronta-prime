import { z } from 'zod';
import { publicationPayloadSchema } from './model';

export const listingCloneSchema = z.object({
  item_id: z.number().int().positive().safe(),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  template: publicationPayloadSchema,
});

export const listingChangeSchema = z
  .object({
    item_id: z.number().int().positive().safe(),
    item_name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(3000).optional(),
    category_id: z.number().int().positive().safe().optional(),
    image: z
      .object({ image_id_list: z.array(z.string().min(1).max(200)).min(1).max(9) })
      .optional(),
    attribute_list: z
      .array(
        z.object({
          attribute_id: z.number().int().positive().safe(),
          attribute_value_list: z
            .array(
              z.object({
                value_id: z.number().int().nonnegative().safe(),
                original_value_name: z.string().max(500),
              }),
            )
            .min(1),
        }),
      )
      .max(100)
      .optional(),
  })
  .refine(
    (value) => Object.keys(value).some((key) => !['item_id', 'attribute_list'].includes(key)),
    'Escolha uma alteração.',
  );
export const brandChangeSchema = z.object({
  shop_name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(3000),
  shop_logo: z.string().min(1).max(2000),
});
export function changeMatches(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
): boolean {
  return Object.entries(expected)
    .filter(([key]) => key !== 'item_id')
    .every(([key, value]) => {
      if (key === 'image')
        return (
          JSON.stringify(
            (actual.image as { image_id_list?: string[] } | undefined)?.image_id_list,
          ) === JSON.stringify((value as { image_id_list: string[] }).image_id_list)
        );
      return JSON.stringify(actual[key]) === JSON.stringify(value);
    });
}
