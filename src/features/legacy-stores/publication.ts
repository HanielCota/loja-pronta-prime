import { z } from 'zod';
import type { PublicationPayload } from '@/features/assistant/model';
import { buildProductVariations } from '@/features/assistant/supplier-offer';
import {
  prepareSupplierProduct,
  supplierProductSchema,
  type SupplierProduct,
} from '@/features/shopee/catalog';
import { recoveredImageKey, recoveredProductImages } from './catalog-import';
import { legacyRecordHash, type RestoredProduct } from './recovery';

export const RECOVERED_REVIEW_TTL = 15 * 60 * 1000;
export const recoveredPublicationStatuses = [
  'editing',
  'review',
  'pending',
  'preparing',
  'sending',
  'published',
  'blocked',
  'unknown',
] as const;
export type RecoveredPublicationStatus = (typeof recoveredPublicationStatuses)[number];
export const publicationLocked = (status: RecoveredPublicationStatus) =>
  ['pending', 'preparing', 'sending', 'published', 'unknown'].includes(status);
export type PublicationContext = {
  version: string;
  values?: Record<string, string[]>;
  problem?: string;
  shopName: string;
  categories: { id: number; name: string }[];
  channels: { id: number; name: string }[];
  categoryId?: number;
  unsupported?: string[];
  limits?: {
    title: { min: number; max: number };
    description: { min: number; max: number };
    price: { min: number; max: number };
    stock: { min: number; max: number };
    images: { min: number; max: number };
    gtin: 'Mandatory' | 'Flexible' | 'Optional';
  };
  attributes: {
    id: number;
    name: string;
    mandatory: boolean;
    dependencies?: { attributeId: number; valueId: number }[];
    supported?: boolean;
    numeric?: boolean;
    values: { id: number; name: string }[];
  }[];
  brands: { id: number; name: string }[];
};
export type RecoveredPublicationIntent = {
  offer: SupplierProduct;
  barcodes?: Record<string, string>;
  productHash: string;
  sourceHash: string;
  revision: number;
};
const money = z
  .string()
  .trim()
  .regex(/^\d{1,7}(?:[,.]\d{1,2})?$/)
  .transform((value) => Math.round(Number(value.replace(',', '.')) * 100))
  .pipe(z.number().int().positive().max(100_000_000));
const quantity = z
  .string()
  .regex(/^\d{1,7}$/)
  .transform(Number)
  .pipe(z.number().int().min(0).max(1_000_000));
const dimension = z
  .string()
  .regex(/^\d{1,4}$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(1000));

/** Only current seller input supplies costs, stock and packaging; archived offers are never current. */
export function recoveredPublicationOffer(
  product: RestoredProduct,
  context: PublicationContext,
  form: FormData,
  now: Date,
): SupplierProduct {
  if (form.get('currentData') !== 'confirmed' || !context.categoryId)
    throw new Error('Confirme os dados atuais com seu fornecedor.');
  const images = recoveredProductImages(product)
    .slice(0, 9)
    .map((asset) => {
      if (!recoveredImageKey(asset)) throw new Error('Uma foto recuperada precisa de conferência.');
      // Logical identifiers only. The worker resolves these exact hashes from private storage.
      return `https://recovered.invalid/images/${asset.sha256}`;
    });
  const variants = product.variants.map((variant, index) => ({
    sku: variant.sku,
    options: variant.options,
    costCents: money.parse(form.get(`cost-${index}`)),
    priceCents: money.parse(form.get(`price-${index}`)),
    stock: quantity.parse(form.get(`stock-${index}`)),
  }));
  const attributes = activeRecoveredAttributes(context, (name) =>
    String(form.get(`attribute-${name}`) ?? ''),
  ).flatMap((attribute) => {
    if (attribute.supported === false) {
      if (attribute.mandatory)
        throw new Error('Esta categoria exige campos adicionais na Central do Vendedor.');
      return [];
    }
    const raw = String(form.get(`attribute-${attribute.id}`) ?? '').trim();
    if (!raw && !attribute.mandatory) return [];
    if (!raw) throw new Error(`Preencha: ${attribute.name}.`);
    if (attribute.numeric && !/^\d+(?:[,.]\d+)?$/.test(raw))
      throw new Error('Informe o valor numérico do atributo.');
    if (!attribute.values.length)
      return [
        { id: attribute.id, values: [{ id: 0, name: z.string().min(1).max(500).parse(raw) }] },
      ];
    const value = attribute.values.find((candidate) => String(candidate.id) === raw);
    if (!value) throw new Error('Confira os atributos do produto.');
    return [{ id: attribute.id, values: [value] }];
  });
  const brand = context.brands.find((candidate) => String(candidate.id) === form.get('brandId'));
  const logisticIds = [...new Set(form.getAll('channelId').map(String))].map((value) => {
    const channel = context.channels.find((candidate) => String(candidate.id) === value);
    if (!channel) throw new Error('Escolha um frete disponível para sua loja.');
    return channel.id;
  });
  if (!brand || !logisticIds.length) throw new Error('Escolha a marca e o frete.');
  const offer = supplierProductSchema.parse({
    supplierId: 'seller-reviewed-recovery',
    sku: product.sku,
    title: z.string().trim().min(1).max(120).parse(product.title),
    description: z.string().trim().min(1).max(5000).parse(product.description),
    images,
    costCents: variants.length
      ? Math.min(...variants.map((row) => row.costCents))
      : money.parse(form.get('cost')),
    priceCents: variants.length
      ? Math.min(...variants.map((row) => row.priceCents))
      : product.priceCents,
    stock: variants.length
      ? variants.reduce((total, row) => total + row.stock, 0)
      : quantity.parse(form.get('stock')),
    weightGrams: quantity.pipe(z.number().positive()).parse(form.get('weightGrams')),
    dimensionsCm: {
      length: dimension.parse(form.get('length')),
      width: dimension.parse(form.get('width')),
      height: dimension.parse(form.get('height')),
    },
    updatedAt: now.toISOString(),
    marketplace: { categoryId: context.categoryId, brandId: brand.id, attributes, logisticIds },
    variants,
  });
  if (offer.stock > 1_000_000 || offer.priceCents > 100_000_000)
    throw new Error('Revise o preço e a quantidade.');
  const prepared = prepareSupplierProduct(offer, now);
  if (prepared.status !== 'prepared')
    throw new Error('Confira o estoque e mantenha cada preço acima do custo atual.');
  // Sparse or ambiguous recovered combinations must not silently become different products.
  const variations = buildProductVariations(offer);
  if (
    offer.variants.length > 50 ||
    variations?.tier_variation.some(
      (tier) =>
        tier.option_list.length > 50 || tier.option_list.some((value) => value.option.length > 20),
    )
  )
    throw new Error('As opções de variação precisam de revisão antes de publicar.');
  assertRecoveredMarketplace(offer, context, recoveredBarcodes(offer, context, form));
  return offer;
}

export function recoveredPublicationFingerprint(value: {
  importId: string;
  applicationId: string;
  shopId: number;
  context: PublicationContext;
  intent: RecoveredPublicationIntent;
  expiresAt: Date;
}) {
  return legacyRecordHash({ ...value, expiresAt: value.expiresAt.toISOString() });
}

export const recoveredPublicationMessages: Record<RecoveredPublicationStatus, string> = {
  editing: 'Preencha os dados atuais para revisar o envio.',
  review: 'Confira tudo abaixo. O envio só começa quando você confirmar.',
  pending: 'Publicação confirmada. Aguarde o envio e atualize esta página para acompanhar.',
  preparing: 'Conferindo os dados e preparando as fotos para sua loja.',
  sending: 'Enviando o produto para a Shopee. Aguarde a confirmação.',
  published: 'Produto publicado na Shopee.',
  blocked:
    'O envio foi interrompido antes de criar o anúncio. Revise os dados para tentar de novo.',
  unknown:
    'Não foi possível confirmar o resultado. Confira o anúncio na Central do Vendedor antes de tentar qualquer novo envio. O sistema não vai repetir esta publicação.',
};

export const recoveredConfirmationSchema = z.object({
  productId: z.guid(),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  confirmation: z.literal('confirmed'),
});

export function activeRecoveredAttributes(
  context: PublicationContext,
  valueFor: (attributeId: number) => string,
) {
  const active = context.attributes.filter(
    (attribute) =>
      attribute.dependencies?.every(
        (parent) => valueFor(parent.attributeId) === String(parent.valueId),
      ) ?? true,
  );
  const unique = new Map<number, PublicationContext['attributes'][number]>();
  for (const attribute of active) {
    const previous = unique.get(attribute.id);
    if (!previous) unique.set(attribute.id, attribute);
    else if (
      JSON.stringify(previous.values) !== JSON.stringify(attribute.values) ||
      previous.supported !== attribute.supported
    )
      unique.set(attribute.id, { ...previous, mandatory: true, supported: false });
    else if (attribute.mandatory) unique.set(attribute.id, { ...previous, mandatory: true });
  }
  return [...unique.values()];
}

export function validRecoveredBarcode(value: string) {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value) || /^0+$/.test(value)) return false;
  const digits = [...value].map(Number);
  const check = digits.pop()!;
  const sum = digits
    .toReversed()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function recoveredBarcodes(
  offer: SupplierProduct,
  context: PublicationContext,
  form: FormData,
) {
  const rows = offer.variants.length ? offer.variants : [offer];
  return Object.fromEntries(
    rows.flatMap((row, index) => {
      const code = String(form.get(`barcode-${index}`) ?? '').trim();
      const absent = form.get(`noBarcode-${index}`) === 'confirmed';
      if (code && absent)
        throw new Error(
          'Escolha informar o código de barras ou declarar que o produto não tem código.',
        );
      if (absent && context.limits?.gtin === 'Mandatory')
        throw new Error('Esta categoria exige um código de barras válido.');
      if (code && !validRecoveredBarcode(code))
        throw new Error('Confira o código de barras com seu fornecedor.');
      if (!code && !absent && context.limits?.gtin && context.limits.gtin !== 'Optional')
        throw new Error('Informe o código de barras ou confirme que o produto não tem código.');
      return code || absent ? [[row.sku, absent ? '00' : code]] : [];
    }),
  );
}

export function assertRecoveredMarketplace(
  offer: SupplierProduct,
  context: PublicationContext,
  barcodes: Record<string, string>,
) {
  if (
    context.unsupported?.length ||
    !offer.marketplace ||
    context.categoryId !== offer.marketplace.categoryId ||
    !context.channels.length
  )
    throw new Error('A categoria exige dados adicionais.');
  const source = offer.marketplace;
  if (
    !context.brands.some((brand) => brand.id === source.brandId) ||
    !source.logisticIds?.length ||
    source.logisticIds.some((id) => !context.channels.some((channel) => channel.id === id))
  )
    throw new Error('Confira a marca e o frete.');
  const active = activeRecoveredAttributes(context, (id) =>
    String(source.attributes.find((attribute) => attribute.id === id)?.values[0]?.id ?? ''),
  );
  for (const definition of active) {
    const supplied = source.attributes.find((attribute) => attribute.id === definition.id);
    if (definition.mandatory && (!supplied || definition.supported === false))
      throw new Error('Preencha os atributos obrigatórios.');
    if (
      supplied?.values.some((value) =>
        definition.values.length
          ? !definition.values.some(
              (allowed) => allowed.id === value.id && allowed.name === value.name,
            )
          : value.id !== 0 || !value.name.trim(),
      )
    )
      throw new Error('Confira os atributos.');
  }
  if (
    source.attributes.some(
      (attribute) =>
        !active.some(
          (definition) => definition.id === attribute.id && definition.supported !== false,
        ),
    )
  )
    throw new Error('Os atributos mudaram.');
  const limits = context.limits;
  if (limits) {
    if (offer.stock > limits.stock.max)
      throw new Error('Confira o estoque total aceito pela categoria.');
    if (
      !within(offer.title.length, limits.title) ||
      !within(offer.description.length, limits.description) ||
      !within(offer.images.length, limits.images)
    )
      throw new Error(
        'Confira o tamanho do nome, da descrição e a quantidade de fotos para esta categoria.',
      );
    for (const row of offer.variants.length ? offer.variants : [offer]) {
      const code = barcodes[row.sku];
      if (
        !within(row.priceCents / 100, limits.price) ||
        row.stock > limits.stock.max ||
        (row.stock > 0 && row.stock < limits.stock.min)
      )
        throw new Error('Confira o preço e o estoque aceitos pela categoria.');
      if (
        (limits.gtin === 'Mandatory' && (!code || !validRecoveredBarcode(code))) ||
        (limits.gtin === 'Flexible' && !code) ||
        (code && code !== '00' && !validRecoveredBarcode(code))
      )
        throw new Error('Confira os códigos de barras exigidos nesta categoria.');
    }
  }
}

export function recoveredListingPayload(
  payload: PublicationPayload,
  intent: RecoveredPublicationIntent,
) {
  const { normal_stock: parentStock, variations, sourceImages: _images, ...base } = payload;
  const parentCode = intent.barcodes?.[intent.offer.variants[0]?.sku ?? intent.offer.sku];
  return {
    base: {
      ...base,
      item_status: 'UNLIST' as const,
      seller_stock: [{ stock: parentStock }],
      ...(parentCode ? { gtin_code: parentCode } : {}),
    },
    variations: variations
      ? {
          tier_variation: variations.tier_variation,
          model: variations.model.map(({ normal_stock, ...model }) => ({
            ...model,
            seller_stock: [{ stock: normal_stock }],
            ...(intent.barcodes?.[model.model_sku]
              ? { gtin_code: intent.barcodes[model.model_sku] }
              : {}),
          })),
        }
      : undefined,
  };
}
export type RecoveredListingPayload = ReturnType<typeof recoveredListingPayload>;

const within = (value: number, range: { min: number; max: number }) =>
  value >= range.min && value <= range.max;
