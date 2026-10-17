import type { SupplierProduct } from '@/features/shopee/catalog';
import type { PublicationPayload } from './model';

export function buildProductVariations(product: SupplierProduct): PublicationPayload['variations'] {
  if (!product.variants.length) return undefined;
  const keys = Object.keys(product.variants[0]!.options).toSorted();
  if (!keys.length || keys.length > 2 || keys.some((key) => key.length > 14))
    throw new Error('Informe uma ou duas opções de variação.');
  const tiers = keys.map((name) => ({
    name,
    option_list: [...new Set(product.variants.map((row) => row.options[name]))].map((option) => ({
      option: option!,
    })),
  }));
  const seen = new Set<string>();
  const model = product.variants.map((variant) => {
    if (Object.keys(variant.options).toSorted().join('\0') !== keys.join('\0'))
      throw new Error('As variações precisam das mesmas opções.');
    const tier_index = keys.map((key, index) =>
      tiers[index]!.option_list.findIndex((row) => row.option === variant.options[key]),
    );
    const key = tier_index.join(',');
    if (seen.has(key)) throw new Error('Há uma combinação de variação repetida.');
    seen.add(key);
    return {
      tier_index,
      model_sku: variant.sku,
      original_price: variant.priceCents / 100,
      normal_stock: variant.stock,
    };
  });
  if (tiers.reduce((total, tier) => total * tier.option_list.length, 1) !== model.length)
    throw new Error(
      'O fornecedor precisa informar todas as combinações, inclusive as sem estoque.',
    );
  return { tier_variation: tiers, model };
}

/** A autorização inclui todos os SKUs, preços e quantidades das variações. */
export function matchesSupplierOffer(payload: PublicationPayload, product: SupplierProduct) {
  if (
    payload.item_sku !== product.sku ||
    Math.round(payload.original_price * 100) !== product.priceCents ||
    payload.normal_stock > product.stock ||
    (payload.variations &&
      payload.normal_stock !==
        payload.variations.model.reduce((total, model) => total + model.normal_stock, 0))
  )
    return false;
  try {
    return JSON.stringify(payload.variations) === JSON.stringify(buildProductVariations(product));
  } catch {
    return false;
  }
}
