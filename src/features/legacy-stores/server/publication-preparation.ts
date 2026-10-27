import { publicationPayloadSchema } from '@/features/assistant/model';
import { buildProductVariations } from '@/features/assistant/supplier-offer';
import type { ShopeeConfiguration } from '@/features/shopee/authorization';
import type { downloadPublicFile } from '@/features/shopee/server/remote-file';
import { uploadShopeeProductImages } from '@/features/shopee/server/preparation';
import { assertRecoveredMarketplace, type RecoveredPublicationIntent } from '../publication';
import { recoveredPublicationOptions, recoveredCategoryOptions } from './publication-options';

/** Re-read current category requirements before uploading any confirmed private media. */
export async function prepareRecoveredShopeeProduct(
  config: ShopeeConfiguration,
  access: { shopId: number; accessToken: string },
  intent: RecoveredPublicationIntent,
  fetcher: typeof fetch,
  downloader: typeof downloadPublicFile,
) {
  const product = intent.offer;
  if (!product.marketplace) throw new Error('category');
  const current = await recoveredCategoryOptions(
    config,
    access,
    await recoveredPublicationOptions(config, access, fetcher),
    product.marketplace.categoryId,
    fetcher,
  );
  assertRecoveredMarketplace(product, current, intent.barcodes ?? {});
  const source = product.marketplace;
  const brand = current.brands.find((candidate) => candidate.id === source.brandId)!;
  const imageIds = await uploadShopeeProductImages(
    config,
    access,
    product.images,
    [],
    fetcher,
    undefined,
    downloader,
  );
  return publicationPayloadSchema.parse({
    item_sku: product.sku,
    item_name: product.title,
    description: product.description,
    category_id: source.categoryId,
    original_price: product.priceCents / 100,
    normal_stock: product.stock,
    weight: product.weightGrams / 1000,
    condition: 'NEW',
    item_status: 'NORMAL',
    image: { image_id_list: imageIds },
    dimension: {
      package_length: product.dimensionsCm.length,
      package_width: product.dimensionsCm.width,
      package_height: product.dimensionsCm.height,
    },
    logistic_info: source.logisticIds!.map((logistic_id) => ({
      logistic_id,
      enabled: true,
      is_free: false,
    })),
    attribute_list: source.attributes.map((attribute) => ({
      attribute_id: attribute.id,
      attribute_value_list: attribute.values.map((value) => ({
        value_id: value.id,
        original_value_name: value.name,
      })),
    })),
    brand: { brand_id: brand.id, original_brand_name: brand.id ? brand.name : '' },
    variations: buildProductVariations(product),
  });
}
