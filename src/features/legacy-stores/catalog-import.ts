import { z } from 'zod';
import type { RestoredProduct } from './recovery';

export const recoveredSelectionSchema = z.object({
  storeId: z.guid(),
  productIds: z
    .array(z.guid())
    .min(1)
    .max(50)
    .transform((ids) => [...new Set(ids)]),
});

export const catalogReviewSchema = z.object({
  productId: z.guid(),
  revision: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(5000),
  price: z
    .string()
    .trim()
    .regex(/^\d{1,7}(?:[,.]\d{1,2})?$/)
    .transform((value) => Math.round(Number(value.replace(',', '.')) * 100))
    .pipe(z.number().int().positive().safe()),
});

export function recoveredImageKey(asset: { key: string; sha256: string }) {
  return /^[a-f0-9]{64}$/.test(asset.sha256) &&
    asset.key === `recovery/shopee/images/sha256/${asset.sha256}`
    ? asset.key
    : null;
}

export function recoveredProductImages(product: RestoredProduct) {
  const assets = [
    ...product.images,
    ...product.axes.flatMap((axis) =>
      axis.options.flatMap((option) => (option.image ? [option.image] : [])),
    ),
  ];
  return [...new Map(assets.map((asset) => [asset.key, asset])).values()];
}
