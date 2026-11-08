import { createHash } from 'node:crypto';
import { prepareSupplierProduct } from '@/features/shopee/catalog';

export const INITIAL_DELIVERY_SIZE = 5;

export function shopeeDeliveryShopId(value: string) {
  if (!URL.canParse(value)) return null;
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    !['shopee.com.br', 'www.shopee.com.br'].includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password
  )
    return null;
  const id = /^\/shop\/([1-9]\d{0,15})\/?$/.exec(url.pathname)?.[1];
  return id && Number.isSafeInteger(Number(id)) ? id : null;
}

export function shopeeDeliveryShopUrl(shopId: string) {
  return `https://shopee.com.br/shop/${shopId}`;
}

export function parseAssistedDeliveryPilot(accountId?: string, shopUrl?: string) {
  const userId = accountId?.trim();
  const shopId = shopeeDeliveryShopId(shopUrl?.trim() ?? '');
  return userId && shopId ? { userId, shopId } : null;
}

export function prepareDeliveryOffer(input: unknown, now: Date) {
  const prepared = prepareSupplierProduct(input, now);
  if (prepared.status !== 'prepared') return null;
  const product = prepared.product;
  if (product.variants.length || !product.marketplace) return null;
  const offer = {
    supplierId: product.supplierId,
    sku: product.sku,
    title: product.title,
    description: product.description,
    images: product.images.slice(0, 9),
    priceCents: product.priceCents,
    weightGrams: product.weightGrams,
    dimensionsCm: product.dimensionsCm,
    categoryId: product.marketplace.categoryId,
    brandId: product.marketplace.brandId,
    attributes: product.marketplace.attributes,
  };
  const fingerprint = createHash('sha256').update(JSON.stringify(offer)).digest('hex');
  return { ...offer, stock: product.stock, fingerprint };
}

export type DeliveryOffer = NonNullable<ReturnType<typeof prepareDeliveryOffer>>;
export type DeliverySelection = Pick<DeliveryOffer, 'supplierId' | 'sku' | 'fingerprint'>;

export function deliveryApprovalFingerprint(brand: string, offers: readonly DeliverySelection[]) {
  return createHash('sha256')
    .update(JSON.stringify([brand, ...offers.map((offer) => offer.fingerprint)]))
    .digest('hex');
}
