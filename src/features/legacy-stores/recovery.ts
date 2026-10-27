import { createHash } from 'node:crypto';
import { z } from 'zod';

const identifier = z.number().int().positive().safe();
const imageSchema = z.object({ image_url: z.string().optional() }).passthrough();
const modelSchema = z
  .object({
    model_id: identifier,
    tier_index: z.array(z.number().int().nonnegative()).max(2),
    model_sku: z.string().optional(),
    price_info: z
      .array(
        z
          .object({ original_price: z.number().optional(), currency: z.string().optional() })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();
export const recoveredItemSchema = z
  .object({
    item_id: identifier,
    item_name: z.string().min(1).max(1000),
    description: z.string().max(100_000).optional().default(''),
    category_id: identifier,
    item_sku: z.string().optional(),
    item_status: z.string(),
    has_model: z.boolean(),
    image: z.object({ image_url_list: z.array(z.string()).max(30) }),
    weight: z.union([z.number(), z.string()]).optional(),
    dimension: z
      .object({ package_length: z.number(), package_width: z.number(), package_height: z.number() })
      .optional(),
    brand: z.object({ brand_id: z.number().int().nonnegative() }).passthrough().optional(),
    recovered_models: z
      .object({
        tier_variation: z.array(
          z.object({
            name: z.string(),
            option_list: z.array(z.object({ option: z.string(), image: imageSchema.optional() })),
          }),
        ),
        model: z.array(modelSchema),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
export type RecoveredItem = z.infer<typeof recoveredItemSchema>;

export type ArchivedImage = {
  key: string;
  sha256: string;
  bytes: number;
  contentType: string;
};
export type ImageManifest = {
  shopId: number;
  catalogSha256: string;
  assets: (ArchivedImage & { url: string; checksumVerified: boolean })[];
};
export type RecoverySource = {
  shopId: number;
  catalogSha256: string;
  capturedAt: string;
  shopName: string;
  items: RecoveredItem[];
  images: ImageManifest;
};
export type HistoricalProduct = {
  id: string;
  storeId: string;
  userId: string | null;
  shopId: string | null;
  storeNames: string[];
  title: string | null;
  description: string | null;
  price: number;
  itemId: string | null;
  protected: boolean;
  sourceHash: string;
};
type Variant = {
  supplierSku: string | null;
  options: Record<string, string>;
  observedPriceCents: number | null;
};
type Axis = { name: string; options: { label: string; image: ArchivedImage | null }[] };
type SourceReference = {
  shopId: number;
  itemId: number;
  catalogSha256: string;
  capturedAt: string;
  status: string;
};
export type BaseProduct = {
  id: string;
  title: string;
  description: string;
  titleKey: string;
  descriptionKey: string | null;
  variantFingerprint: string;
  categoryId: number;
  brandId: number;
  weightKg: number | null;
  dimensionsCm: { length: number; width: number; height: number } | null;
  images: ArchivedImage[];
  axes: Axis[];
  variants: Variant[];
  sources: SourceReference[];
  issues: string[];
  warnings: string[];
};
export type RestoredProduct = {
  legacyProductId: string;
  baseProductId: string;
  title: string;
  description: string;
  priceCents: number;
  sku: string;
  images: ArchivedImage[];
  categoryId: number;
  brandId: number;
  weightKg: number | null;
  dimensionsCm: BaseProduct['dimensionsCm'];
  axes: Axis[];
  variants: (Omit<Variant, 'observedPriceCents'> & { sku: string })[];
  publicationReady: false;
  publicationBlockers: string[];
};
export type ProductRecovery = {
  productId: string;
  storeId: string;
  userId: string | null;
  sourceHash: string;
  status: 'recovered' | 'review' | 'unmatched' | 'protected';
  method: 'shop_item_id' | 'title_description' | null;
  baseProductId: string | null;
  reasons: string[];
  product: RestoredProduct | null;
};

export const recoveryHash = (value: string | Uint8Array) =>
  createHash('sha256').update(value).digest('hex');
function canonicalJson(value: unknown): unknown {
  return Array.isArray(value)
    ? value.map(canonicalJson)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, child]) => [key, canonicalJson(child)]),
        )
      : value;
}
export function legacyRecordHash(value: unknown): string {
  return recoveryHash(JSON.stringify(canonicalJson(value)));
}
const normalized = (value: string) =>
  value.normalize('NFKD').replace(/\p{M}/gu, '').replace(/\s+/gu, ' ').trim().toUpperCase();
// These literal wrappers were verified in the immutable legacy export, not inferred from product copy.
const brandingIntroductions = new Set([
  'VOCE ESTA NA <STORE> — SUA LOJA DE CONFIANCA.',
  'A <STORE> TRAZ MAIS UM ITEM INCRIVEL PRO SEU DIA A DIA.',
  'BEM-VINDO(A) A <STORE>! CONFIRA MAIS UM PRODUTO SELECIONADO ESPECIALMENTE PRA VOCE.',
  'CONHECA A <STORE>, ONDE QUALIDADE E ATENCAO ANDAM JUNTAS.',
  'ESTA E A <STORE>, E ESTE E UM DOS NOSSOS DESTAQUES.',
  'DIRETO DA <STORE> PRA VOCE:',
  'MAIS UMA NOVIDADE DA <STORE> ESPERANDO POR VOCE:',
  '<STORE> — ATENDIMENTO PROXIMO, PRODUTOS DE VERDADE.',
  'AQUI NA <STORE>, CADA PRODUTO PASSA POR UMA SELECAO CUIDADOSA.',
  'VOCE ACABA DE CHEGAR NA <STORE>.',
  '<STORE> — PRODUTOS SELECIONADOS A DEDO.',
  '<STORE> APRESENTA:',
  '<STORE>: PORQUE VOCE MERECE O MELHOR.',
  'DA CURADORIA DA <STORE> PRA SUA CASA:',
  'MAIS UMA ESCOLHA CERTA DA <STORE>:',
  'OLA! AQUI E A <STORE>, PRAZER EM RECEBER VOCE.',
  'BEM-VINDO(A) AO UNIVERSO <STORE>.',
  'QUE BOM TER VOCE NA <STORE>!',
  'SEJA BEM-VINDO(A) AO CATALOGO DA <STORE>.',
  '<STORE> APRESENTA ESTE DESTAQUE ESPECIAL:',
]);
const brandingEndings = new Set([
  'APROVEITE. A <STORE> CUIDA DO RESTO PRA VOCE.',
  'CONTE COM A <STORE> ANTES, DURANTE E DEPOIS DA COMPRA.',
  'ADICIONE AO CARRINHO E APROVEITE. A <STORE> CUIDA DO RESTO.',
  '<STORE>: FEITO COM CUIDADO, ENTREGUE COM CARINHO.',
  'FACA SEU PEDIDO AGORA. A <STORE> AGRADECE A CONFIANCA.',
  '<STORE> AGRADECE SUA VISITA. VOLTE SEMPRE!',
  'FACA PARTE DA FAMILIA <STORE>. TE ESPERAMOS!',
  'ESTAMOS ONLINE PRA RESPONDER VOCE: CHAMA A <STORE>!',
  'OBRIGADO POR ESCOLHER A <STORE>. QUALQUER DUVIDA, E SO CHAMAR!',
  '<STORE> — SUA SATISFACAO E A NOSSA PRIORIDADE.',
  '<STORE> AGRADECE PELA VISITA. CONTE COM A GENTE SEMPRE QUE PRECISAR!',
  'TEM DUVIDA? A <STORE> ESTA AQUI PRA TE AJUDAR.',
  '<STORE> AGRADECE E DESEJA UMA OTIMA COMPRA.',
  'COMPRE COM CONFIANCA — A <STORE> RESPONDE EM POUCAS HORAS.',
  '<STORE>: O ATENDIMENTO QUE VOCE MERECE, SEMPRE.',
  'COMPRE NA <STORE> E SINTA A DIFERENCA DE QUEM SE IMPORTA.',
  '<STORE> — ATENDIMENTO PROXIMO, DO INICIO AO FIM.',
  '<STORE>: PRODUTOS SELECIONADOS, ATENDIMENTO DEDICADO.',
  '<STORE> — SEMPRE DISPONIVEL PRA VOCE.',
  'COMPRE COM TRANQUILIDADE: A <STORE> RESPONDE RAPIDO E CUIDA DE CADA PEDIDO.',
]);

/** Only known store suffixes and the observed branding wrapper are removed. */
export function productIdentity(
  title: string | null,
  description: string | null,
  storeNames: string[] = [],
) {
  const originalTitle = (title ?? '').trim();
  let titleBody = originalTitle;
  let paragraphs = (description ?? '')
    .split(/\r?\n\s*\r?\n/u)
    .map((value) => value.trim())
    .filter(Boolean);
  const suffix = originalTitle.includes(' — ')
    ? originalTitle.slice(originalTitle.lastIndexOf(' — ') + 3).trim()
    : '';
  const brands = [...new Set([...storeNames.filter(Boolean), suffix])].toSorted(
    (a, b) => b.length - a.length,
  );
  for (const brand of brands) {
    const name = normalized(brand);
    if (!name) continue;
    const masked = (value: string) =>
      normalized(value)
        .split(name)
        .join('<STORE>')
        .replace(/\s+([.,!:])/gu, '$1');
    const wrapper =
      paragraphs.length >= 3 &&
      normalized(paragraphs[1]!) === name &&
      brandingIntroductions.has(masked(paragraphs[0]!));
    const known = storeNames.some((value) => normalized(value) === name);
    if (!known && !wrapper) continue;
    for (const match of titleBody.matchAll(/ — /gu)) {
      if (normalized(titleBody.slice(match.index + 3)) === name) {
        titleBody = titleBody.slice(0, match.index).trim();
        break;
      }
    }
    if (wrapper) {
      paragraphs = paragraphs.slice(2);
      if (brandingEndings.has(masked(paragraphs.at(-1)!))) paragraphs.pop();
    }
  }
  const plain = paragraphs.join('\n\n');
  const body = normalized(plain);
  return {
    title: titleBody,
    titleKey: normalized(titleBody),
    description: plain,
    descriptionKey: body.length >= 80 ? recoveryHash(body) : null,
  };
}

function archivedImage(url: string, manifest: ImageManifest): ArchivedImage | null {
  const asset = manifest.assets.find((candidate) => candidate.url === url);
  if (
    !asset ||
    !asset.checksumVerified ||
    !/^[a-f0-9]{64}$/.test(asset.sha256) ||
    asset.key !== `recovery/shopee/images/sha256/${asset.sha256}` ||
    !Number.isSafeInteger(asset.bytes) ||
    asset.bytes <= 0 ||
    !['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(
      asset.contentType,
    )
  )
    return null;
  return {
    key: asset.key,
    sha256: asset.sha256,
    bytes: asset.bytes,
    contentType: asset.contentType,
  };
}

export function validateRecoveredItem(
  item: RecoveredItem,
  source: Omit<RecoverySource, 'items'>,
): BaseProduct {
  const identity = productIdentity(item.item_name, item.description, [source.shopName]);
  const issues: string[] = [];
  const warnings: string[] = [];
  if (
    source.images.shopId !== source.shopId ||
    source.images.catalogSha256 !== source.catalogSha256
  )
    issues.push('image_manifest_source_mismatch');
  const images = item.image.image_url_list.flatMap((url) => {
    const image = archivedImage(url, source.images);
    if (!image) {
      issues.push('gallery_image_not_archived');
      return [];
    }
    return [image];
  });
  if (!images.length) issues.push('gallery_images_missing');
  const axes: Axis[] = [];
  const variants: Variant[] = [];
  if (item.has_model) {
    const tiers = item.recovered_models?.tier_variation ?? [];
    const models = item.recovered_models?.model ?? [];
    if (!tiers.length || tiers.length > 2 || !models.length || models.length > 100)
      issues.push('invalid_variant_count');
    const axisNames = new Set<string>();
    for (const tier of tiers) {
      const name = normalized(tier.name);
      if (!name || axisNames.has(name)) issues.push('duplicate_or_empty_variant_axis');
      axisNames.add(name);
      const labels = new Set<string>();
      const options = tier.option_list.map((option) => {
        const label = normalized(option.option);
        if (!label || labels.has(label)) issues.push('duplicate_or_empty_variant_option');
        labels.add(label);
        const image = option.image?.image_url
          ? archivedImage(option.image.image_url, source.images)
          : null;
        if (option.image?.image_url && !image) issues.push('variant_image_not_archived');
        return { label: option.option.trim(), image };
      });
      if (!options.length) issues.push('variant_options_missing');
      axes.push({ name: tier.name.trim(), options });
    }
    const combinations = new Set<string>();
    const skus = new Set<string>();
    const modelIds = new Set<number>();
    for (const model of models) {
      const valid =
        model.tier_index.length === tiers.length &&
        model.tier_index.every(
          (index, axis) => index >= 0 && index < tiers[axis]!.option_list.length,
        );
      if (!valid || modelIds.has(model.model_id)) {
        issues.push('invalid_variant_coordinates');
        continue;
      }
      modelIds.add(model.model_id);
      const key = JSON.stringify(model.tier_index);
      if (combinations.has(key)) issues.push('duplicate_variant_combination');
      combinations.add(key);
      const sku = model.model_sku?.trim() || null;
      if (sku && skus.has(sku)) issues.push('duplicate_supplier_variant_sku');
      if (sku) skus.add(sku);
      const options = Object.fromEntries(
        model.tier_index.map((index, axis) => [
          tiers[axis]!.name.trim(),
          tiers[axis]!.option_list[index]!.option.trim(),
        ]),
      );
      const price = model.price_info?.find((row) => row.currency === 'BRL')?.original_price;
      variants.push({
        supplierSku: sku,
        options,
        observedPriceCents:
          price !== undefined && price > 0 && Number.isSafeInteger(Math.round(price * 100))
            ? Math.round(price * 100)
            : null,
      });
    }
    if (models.length < tiers.reduce((count, tier) => count * tier.option_list.length, 1))
      warnings.push('partial_variant_matrix_preserved');
  } else if (item.recovered_models?.model.length) issues.push('unexpected_variants');
  const weight = Number(item.weight);
  const weightKg = Number.isFinite(weight) && weight > 0 ? weight : null;
  const dimension = item.dimension;
  const dimensionsCm =
    dimension && Object.values(dimension).every((value) => Number.isFinite(value) && value > 0)
      ? {
          length: dimension.package_length,
          width: dimension.package_width,
          height: dimension.package_height,
        }
      : null;
  if (
    !weightKg ||
    !dimensionsCm ||
    (dimensionsCm.length === 1 && dimensionsCm.width === 1 && dimensionsCm.height === 1)
  )
    warnings.push('shipping_measurements_require_review');
  if (!identity.descriptionKey) warnings.push('description_too_short_for_shared_matching');
  const variantFingerprint = recoveryHash(
    JSON.stringify(
      variants
        .map((variant) => ({
          sku: variant.supplierSku,
          options: Object.entries(variant.options)
            .map(([axis, label]) => [normalized(axis), normalized(label)])
            .toSorted(([a], [b]) => a!.localeCompare(b!)),
        }))
        .toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    ),
  );
  const id = recoveryHash(
    JSON.stringify({
      title: identity.titleKey,
      description: identity.descriptionKey,
      variants: variantFingerprint,
      category: item.category_id,
      brand: item.brand?.brand_id ?? 0,
      weightKg,
      dimensionsCm,
    }),
  );
  return {
    id,
    title: identity.title,
    description: identity.description,
    titleKey: identity.titleKey,
    descriptionKey: identity.descriptionKey,
    variantFingerprint,
    categoryId: item.category_id,
    brandId: item.brand?.brand_id ?? 0,
    weightKg,
    dimensionsCm,
    images,
    axes,
    variants,
    sources: [
      {
        shopId: source.shopId,
        itemId: item.item_id,
        catalogSha256: source.catalogSha256,
        capturedAt: source.capturedAt,
        status: item.item_status,
      },
    ],
    issues: [...new Set(issues)],
    warnings: [...new Set(warnings)],
  };
}

const aliasKey = (identity: ReturnType<typeof productIdentity>) =>
  identity.titleKey && identity.descriptionKey
    ? `${identity.titleKey}:${identity.descriptionKey}`
    : null;
const sourceKey = (shopId: string | number, itemId: string | number) => `${shopId}:${itemId}`;

export function addHistoricalRecoveryAlias(catalog: RecoveryCatalog, record: HistoricalProduct) {
  if (record.protected || !record.userId || !record.shopId || !record.itemId) return;
  const ids = catalog.direct.get(sourceKey(record.shopId, record.itemId));
  const key = aliasKey(productIdentity(record.title, record.description, record.storeNames));
  if (ids?.size !== 1 || !key) return;
  const aliases = catalog.aliases.get(key) ?? new Set<string>();
  aliases.add([...ids][0]!);
  catalog.aliases.set(key, aliases);
}

export function buildRecoveryCatalog(sources: RecoverySource[], historical: HistoricalProduct[]) {
  const products = new Map<string, BaseProduct>();
  const direct = new Map<string, Set<string>>();
  const aliases = new Map<string, Set<string>>();
  const addAlias = (key: string | null, id: string) => {
    if (!key) return;
    const ids = aliases.get(key) ?? new Set<string>();
    ids.add(id);
    aliases.set(key, ids);
  };
  for (const source of sources)
    for (const item of source.items) {
      const product = validateRecoveredItem(item, source);
      const previous = products.get(product.id);
      if (previous) {
        previous.sources.push(...product.sources);
        previous.issues = [...new Set([...previous.issues, ...product.issues])];
        previous.warnings = [...new Set([...previous.warnings, ...product.warnings])];
      } else products.set(product.id, product);
      const key = sourceKey(source.shopId, item.item_id);
      const ids = direct.get(key) ?? new Set<string>();
      ids.add(product.id);
      direct.set(key, ids);
      addAlias(
        aliasKey(productIdentity(item.item_name, item.description, [source.shopName])),
        product.id,
      );
    }
  // Original shop/item references provide traceable aliases for earlier personalized copy.
  const catalog = { products, direct, aliases };
  for (const record of historical) addHistoricalRecoveryAlias(catalog, record);
  return catalog;
}
export type RecoveryCatalog = ReturnType<typeof buildRecoveryCatalog>;

export function recoverHistoricalProduct(
  record: HistoricalProduct,
  catalog: RecoveryCatalog,
): ProductRecovery {
  const result: ProductRecovery = {
    productId: record.id,
    storeId: record.storeId,
    userId: record.userId,
    sourceHash: record.sourceHash,
    status: 'unmatched',
    method: null,
    baseProductId: null,
    reasons: [],
    product: null,
  };
  if (record.protected || !record.userId)
    return { ...result, status: 'protected', reasons: ['account_requires_review'] };
  const direct =
    record.shopId && record.itemId
      ? catalog.direct.get(sourceKey(record.shopId, record.itemId))
      : undefined;
  const key = aliasKey(productIdentity(record.title, record.description, record.storeNames));
  const candidates = direct?.size ? direct : key ? catalog.aliases.get(key) : undefined;
  if (!candidates?.size) return { ...result, reasons: ['verified_product_identity_not_found'] };
  if (candidates.size > 1)
    return { ...result, status: 'review', reasons: ['conflicting_product_or_variants'] };
  const product = catalog.products.get([...candidates][0]!)!;
  result.method = direct?.size ? 'shop_item_id' : 'title_description';
  result.baseProductId = product.id;
  if (product.issues.length) return { ...result, status: 'review', reasons: product.issues };
  const priceCents = Math.round(record.price * 100);
  if (!Number.isFinite(record.price) || record.price <= 0 || !Number.isSafeInteger(priceCents))
    return { ...result, status: 'review', reasons: ['invalid_historical_price'] };
  const sku = `R-${record.id}`;
  return {
    ...result,
    status: 'recovered',
    product: {
      legacyProductId: record.id,
      baseProductId: product.id,
      title: record.title?.trim() || product.title,
      description: record.description?.trim() || product.description,
      priceCents,
      sku,
      images: product.images,
      categoryId: product.categoryId,
      brandId: product.brandId,
      weightKg: product.weightKg,
      dimensionsCm: product.dimensionsCm,
      axes: product.axes,
      variants: product.variants.map((variant) => ({
        supplierSku: variant.supplierSku,
        options: variant.options,
        sku: `${sku}-${recoveryHash(
          JSON.stringify(
            Object.entries(variant.options)
              .map(([axis, label]) => [normalized(axis), normalized(label)])
              .toSorted(),
          ),
        ).slice(0, 12)}`,
      })),
      publicationReady: false,
      publicationBlockers: [
        'current_supplier_offer_required',
        'destination_shop_preparation_required',
        ...product.warnings,
      ],
    },
  };
}
