import { expect, test } from 'bun:test';
import sharp from 'sharp';
import { supplierProductSchema } from '../catalog';
import { shopeeConfigurationSchema } from '../authorization';
import { prepareShopeeProduct } from './preparation';

const config = shopeeConfigurationSchema.parse({
  SHOPEE_PARTNER_ID: 123,
  SHOPEE_PARTNER_KEY: 'test-only',
  SHOPEE_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
});
const access = { shopId: 1, accessToken: 'test-only' };
const product = () =>
  supplierProductSchema.parse({
    supplierId: 'supplier',
    sku: 'one',
    title: 'Produto real',
    description: 'Descrição',
    images: ['https://images.example.com/one.jpg'],
    costCents: 1000,
    priceCents: 2000,
    stock: 5,
    weightGrams: 300,
    dimensionsCm: { length: 12, width: 10, height: 4 },
    updatedAt: new Date().toISOString(),
    variants: [],
    marketplace: {
      categoryId: 10,
      attributes: [{ id: 20, values: [{ id: 30, name: 'Algodão' }] }],
    },
  });
const envelope = (response: unknown) => Response.json({ error: '', response });
const transport = (handler: (url: URL, init: RequestInit) => Response | Promise<Response>) =>
  ((input: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(new URL(String(input)), init ?? {}))) as typeof fetch;
test('prepara com categorias, atributos e frete reais e envia a imagem como multipart', async () => {
  let uploads = 0;
  const image = await sharp({
    create: { width: 10, height: 10, channels: 3, background: '#ffffff' },
  })
    .png()
    .toBuffer();
  const fetcher = transport((url, init) => {
    if (url.pathname.endsWith('get_category'))
      return envelope({ category_list: [{ category_id: 10, has_children: false }] });
    if (url.pathname.endsWith('get_attributes'))
      return envelope({
        attribute_list: [
          { attribute_id: 20, is_mandatory: true, attribute_value_list: [{ value_id: 30 }] },
        ],
      });
    if (url.pathname.endsWith('get_channel_list'))
      return envelope({ logistics_channel_list: [{ logistics_channel_id: 40, enabled: true }] });
    expect(url.pathname).toBe('/api/v2/media_space/upload_image');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('image')).toBeInstanceOf(File);
    expect(url.searchParams.has('access_token')).toBe(false);
    uploads++;
    return envelope({ image_info: { image_id: 'real-image-id' } });
  });
  const result = await prepareShopeeProduct(
    config,
    access,
    product(),
    ['images.example.com'],
    fetcher,
    undefined,
    async () => ({ bytes: image, contentType: 'image/png' }),
  );
  expect(result.weight).toBe(0.3);
  expect(result.image.image_id_list).toEqual(['real-image-id']);
  expect(result.logistic_info[0]?.logistic_id).toBe(40);
  expect(result.attribute_list[0]?.attribute_value_list[0]?.value_id).toBe(30);
  await prepareShopeeProduct(
    config,
    access,
    product(),
    ['images.example.com'],
    fetcher,
    result,
    async () => {
      throw new Error('A imagem não deve ser baixada outra vez');
    },
  );
  expect(uploads).toBe(1);
});
test('não envia imagens quando categoria ou atributo obrigatório não confere', async () => {
  let uploads = 0;
  const value = product();
  value.marketplace!.attributes = [];
  await expect(
    prepareShopeeProduct(
      config,
      access,
      value,
      ['images.example.com'],
      transport((url) => {
        if (url.pathname.endsWith('get_category'))
          return envelope({ category_list: [{ category_id: 10, has_children: false }] });
        if (url.pathname.endsWith('get_attributes'))
          return envelope({ attribute_list: [{ attribute_id: 20, is_mandatory: true }] });
        uploads++;
        return envelope({});
      }),
    ),
  ).rejects.toThrow('obrigatório');
  expect(uploads).toBe(0);
});
