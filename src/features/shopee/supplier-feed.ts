import { z } from 'zod';
import { supplierProductSchema } from './catalog';
import { allowedRemoteUrl } from './remote-address';

const sourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/),
  name: z.string().trim().min(1).max(100),
  url: z.url(),
  tokenEnv: z
    .string()
    .regex(/^SUPPLIER_[A-Z0-9_]+_TOKEN$/)
    .optional(),
  imageHosts: z
    .array(z.string().regex(/^[a-z0-9.-]+$/i))
    .min(1)
    .max(30),
  intervalSeconds: z.number().int().min(60).max(600).default(300),
});
export type SupplierSource = z.infer<typeof sourceSchema>;
export function configuredSupplierSources(value = process.env.SUPPLIER_FEEDS): SupplierSource[] {
  if (!value) return [];
  const parsed = z.array(sourceSchema).max(20).parse(JSON.parse(value));
  if (new Set(parsed.map((row) => row.id)).size !== parsed.length)
    throw new Error('Fornecedor repetido.');
  for (const source of parsed) allowedRemoteUrl(source.url, [new URL(source.url).hostname]);
  return parsed;
}
export const supplierFeedSnapshotSchema = z
  .object({
    generatedAt: z.iso.datetime({ offset: true }),
    complete: z.literal(true),
    products: z.array(supplierProductSchema).max(2000),
  })
  .superRefine((snapshot, context) => {
    const keys = snapshot.products.flatMap((row) => [
      row.sku,
      ...row.variants.map((variant) => variant.sku),
    ]);
    if (new Set(keys).size !== keys.length)
      context.addIssue({ code: 'custom', message: 'SKU repetido no catálogo.' });
    if (
      snapshot.products.some((row) => Date.parse(row.updatedAt) > Date.parse(snapshot.generatedAt))
    )
      context.addIssue({ code: 'custom', message: 'Data do produto posterior ao catálogo.' });
  });
