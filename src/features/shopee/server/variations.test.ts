import { expect, test } from 'bun:test';
import { shopeeConfigurationSchema } from '../authorization';
import { publishProductVariations } from './variations';

const config = shopeeConfigurationSchema.parse({
  SHOPEE_PARTNER_ID: 123,
  SHOPEE_PARTNER_KEY: 'test-key',
  SHOPEE_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
});
const access = { shopId: 1, accessToken: 'test-only' };
const expected = {
  tier_variation: [{ name: 'Cor', option_list: [{ option: 'Azul' }] }],
  model: [{ tier_index: [0], model_sku: 'blue', original_price: 20, normal_stock: 2 }],
};
const actual = {
  tier_variation: expected.tier_variation,
  model: [{ tier_index: [0], model_sku: 'blue', price_info: [{ original_price: 20 }] }],
};
const transport = (handler: (url: URL, init: RequestInit) => Response | Promise<Response>) =>
  ((input: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(new URL(String(input)), init ?? {}))) as typeof fetch;
const envelope = (response: unknown) => Response.json({ error: '', response });
test('inicializa uma vez, confere os modelos e só depois coloca o anúncio no ar', async () => {
  const writes: string[] = [];
  let initialized = false;
  await publishProductVariations(
    config,
    access,
    42,
    expected,
    transport((url, init) => {
      if (url.pathname.endsWith('get_model_list'))
        return envelope(initialized ? actual : { tier_variation: [], model: [] });
      writes.push(url.pathname);
      if (url.pathname.endsWith('init_tier_variation')) {
        initialized = true;
        expect(JSON.parse(String(init.body)).item_id).toBe(42);
      }
      return envelope({});
    }),
  );
  expect(writes).toEqual(['/api/v2/product/init_tier_variation', '/api/v2/product/update_item']);
});
test('uma retomada com modelos confirmados não inicializa outra vez', async () => {
  const writes: string[] = [];
  await publishProductVariations(
    config,
    access,
    42,
    expected,
    transport((url, init) => {
      if (init.method === 'GET') return envelope(actual);
      writes.push(url.pathname);
      return envelope({});
    }),
  );
  expect(writes).toEqual(['/api/v2/product/update_item']);
});
test('timeout de variações não repete a escrita nem ativa o anúncio', async () => {
  let writes = 0;
  await expect(
    publishProductVariations(
      config,
      access,
      42,
      expected,
      transport((_url, init) => {
        if (init.method === 'GET') return envelope({ tier_variation: [], model: [] });
        writes++;
        throw new Error('Resposta perdida');
      }),
    ),
  ).rejects.toThrow();
  expect(writes).toBe(1);
});
test('combinações existentes incompatíveis são preservadas sem escrita', async () => {
  let writes = 0;
  await expect(
    publishProductVariations(
      config,
      access,
      42,
      expected,
      transport((_url, init) => {
        if (init.method === 'POST') writes++;
        return envelope({
          ...actual,
          tier_variation: [{ name: 'Cor', option_list: [{ option: 'Verde' }] }],
        });
      }),
    ),
  ).rejects.toThrow('conferência');
  expect(writes).toBe(0);
});
