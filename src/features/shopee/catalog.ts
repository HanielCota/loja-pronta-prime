import { z } from 'zod';

const positiveInteger = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
// O refine roda mesmo com z.url() recusando: sem a guarda, um endereço relativo estouraria
// `new URL` e viraria erro 500 em vez de "imagem inválida".
const httpsUrl = z.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
}, 'Informe uma imagem com endereço HTTPS.');

/** Formato de entrada do fornecedor; não representa um anúncio já aceito pela Shopee. */
export const supplierProductSchema = z
  .object({
    supplierId: z.string().trim().min(1).max(100),
    sku: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(500),
    description: z.string().trim().min(1).max(10000),
    images: z.array(httpsUrl).min(1).max(20),
    costCents: positiveInteger,
    priceCents: positiveInteger,
    stock: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    weightGrams: positiveInteger,
    dimensionsCm: z.object({
      length: positiveInteger,
      width: positiveInteger,
      height: positiveInteger,
    }),
    updatedAt: z.iso.datetime({ offset: true }),
    marketplace: z
      .object({
        categoryId: positiveInteger,
        brandId: z.number().int().nonnegative().safe().default(0),
        attributes: z
          .array(
            z.object({
              id: positiveInteger,
              values: z
                .array(
                  z.object({
                    id: z.number().int().nonnegative().safe(),
                    name: z.string().max(500),
                  }),
                )
                .min(1)
                .max(50),
            }),
          )
          .max(100)
          .default([]),
        logisticIds: z.array(positiveInteger).max(20).optional(),
      })
      .optional(),
    variants: z
      .array(
        z.object({
          sku: z.string().trim().min(1).max(100),
          options: z.record(z.string().trim().min(1), z.string().trim().min(1)),
          costCents: positiveInteger,
          priceCents: positiveInteger,
          stock: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
        }),
      )
      .max(100),
  })
  .superRefine((product, ctx) => {
    const skus = new Set<string>([product.sku]);
    for (const [index, variant] of product.variants.entries()) {
      if (skus.has(variant.sku))
        ctx.addIssue({
          code: 'custom',
          path: ['variants', index, 'sku'],
          message: 'Cada variação precisa de um SKU diferente.',
        });
      skus.add(variant.sku);
      if (!Object.keys(variant.options).length)
        ctx.addIssue({
          code: 'custom',
          path: ['variants', index, 'options'],
          message: 'Informe as opções da variação.',
        });
    }
  });

export type SupplierProduct = z.infer<typeof supplierProductSchema>;

/** Verificações locais. Categoria, frete, atributos e imagens precisam de confirmação da API. */
export function prepareSupplierProduct(input: unknown, now: Date, maxAgeMs = 15 * 60 * 1000) {
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0)
    throw new Error('Prazo de atualização inválido.');
  const parsed = supplierProductSchema.safeParse(input);
  if (!parsed.success)
    return {
      status: 'invalid' as const,
      issues: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  const product = parsed.data;
  const age = now.getTime() - Date.parse(product.updatedAt);
  const issues: string[] = [];
  if (age < 0 || age > maxAgeMs) issues.push('Atualize o preço e o estoque com o fornecedor.');
  const offers = product.variants.length ? product.variants : [product];
  if (!offers.some((offer) => offer.stock > 0)) issues.push('O produto está sem estoque.');
  if (offers.some((offer) => offer.priceCents <= offer.costCents))
    issues.push('Revise o preço de venda e os custos.');
  return { status: issues.length ? ('blocked' as const) : ('prepared' as const), product, issues };
}
