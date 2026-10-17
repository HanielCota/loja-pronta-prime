import { z } from 'zod';
import sharp from 'sharp';
import { publicationPayloadSchema, type PublicationPayload } from '@/features/assistant/model';
import { buildProductVariations } from '@/features/assistant/supplier-offer';
import { prepareSupplierProduct, type SupplierProduct } from '../catalog';
import type { ShopeeConfiguration } from '../authorization';
import { readShopeeResource, uploadShopeeImage } from './resources';
import { downloadPublicFile } from './remote-file';

const id = z.number().int().positive().safe();
export async function prepareShopeeProduct(
  config: ShopeeConfiguration,
  access: { shopId: number; accessToken: string },
  product: SupplierProduct,
  imageHosts: string[],
  fetcher: typeof fetch = fetch,
  previous?: PublicationPayload,
  downloader: typeof downloadPublicFile = downloadPublicFile,
): Promise<PublicationPayload> {
  if (prepareSupplierProduct(product, new Date()).status !== 'prepared' || !product.marketplace)
    throw new Error('O catálogo precisa de dados recentes e categoria Shopee.');
  const source = product.marketplace;
  const categories = await readShopeeResource(
    config,
    access,
    '/api/v2/product/get_category',
    z.object({ category_list: z.array(z.object({ category_id: id, has_children: z.boolean() })) }),
    { language: 'pt-br' },
    fetcher,
  );
  if (
    !categories.category_list.some(
      (row) => row.category_id === source.categoryId && !row.has_children,
    )
  )
    throw new Error('Categoria indisponível.');
  const attributes = await readShopeeResource(
    config,
    access,
    '/api/v2/product/get_attributes',
    z.object({
      attribute_list: z.array(
        z.object({
          attribute_id: id,
          is_mandatory: z.boolean(),
          attribute_value_list: z
            .array(z.object({ value_id: z.number().int().nonnegative().safe() }))
            .optional(),
        }),
      ),
    }),
    { category_id: String(source.categoryId), language: 'pt-br' },
    fetcher,
  );
  for (const attribute of attributes.attribute_list) {
    const supplied = source.attributes.find((row) => row.id === attribute.attribute_id);
    if (attribute.is_mandatory && !supplied)
      throw new Error('O fornecedor precisa informar um atributo obrigatório.');
    if (
      supplied?.values.some(
        (value) =>
          value.id !== 0 &&
          !attribute.attribute_value_list?.some((allowed) => allowed.value_id === value.id),
      )
    )
      throw new Error('Valor de atributo indisponível.');
  }
  if (
    source.attributes.some(
      (row) => !attributes.attribute_list.some((attribute) => attribute.attribute_id === row.id),
    )
  )
    throw new Error('Atributo incompatível com a categoria.');
  const channels = await readShopeeResource(
    config,
    access,
    '/api/v2/logistics/get_channel_list',
    z.object({
      logistics_channel_list: z.array(z.object({ logistics_channel_id: id, enabled: z.boolean() })),
    }),
    {},
    fetcher,
  );
  const selected = channels.logistics_channel_list.filter(
    (row) =>
      row.enabled && (!source.logisticIds || source.logisticIds.includes(row.logistics_channel_id)),
  );
  if (
    !selected.length ||
    source.logisticIds?.some(
      (channel) => !selected.some((row) => row.logistics_channel_id === channel),
    )
  )
    throw new Error('Frete indisponível para esta loja.');
  let brand = { brand_id: 0, original_brand_name: '' };
  if (source.brandId) {
    let found = false;
    for (let offset = 0; offset < 10_000; offset += 100) {
      const brands = await readShopeeResource(
        config,
        access,
        '/api/v2/product/get_brand_list',
        z.object({
          brand_list: z.array(z.object({ brand_id: id, original_brand_name: z.string() })),
          has_next_page: z.boolean(),
        }),
        {
          category_id: String(source.categoryId),
          offset: String(offset),
          page_size: '100',
          status: '1',
        },
        fetcher,
      );
      const match = brands.brand_list.find((row) => row.brand_id === source.brandId);
      if (match) {
        brand = match;
        found = true;
        break;
      }
      if (!brands.has_next_page) break;
    }
    if (!found) throw new Error('Marca de produto indisponível.');
  }
  const reusable =
    JSON.stringify(previous?.sourceImages) === JSON.stringify(product.images.slice(0, 9));
  const imageIds: string[] = reusable ? [...previous!.image.image_id_list] : [];
  for (const image of reusable ? [] : product.images.slice(0, 9)) {
    const remote = await downloader(image, imageHosts, 10_000_000);
    if (!/^image\/(jpeg|png|webp)(;|$)/i.test(remote.contentType))
      throw new Error('Formato de imagem indisponível.');
    const bytes = await sharp(remote.bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 88 })
      .toBuffer();
    imageIds.push(await uploadShopeeImage(config, access, bytes, fetcher));
  }
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
    logistic_info: selected.map((row) => ({
      logistic_id: row.logistics_channel_id,
      enabled: true,
      is_free: false,
    })),
    attribute_list: source.attributes.map((row) => ({
      attribute_id: row.id,
      attribute_value_list: row.values.map((value) => ({
        value_id: value.id,
        original_value_name: value.name,
      })),
    })),
    brand,
    sourceImages: product.images.slice(0, 9),
    variations: buildProductVariations(product),
  });
}
