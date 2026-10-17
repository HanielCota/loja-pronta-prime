// Transporte exclusivo do servidor E2E; nunca permite uma escrita externa.
if (!String(process.env.DATABASE_URL).includes('/loja_pronta_test_'))
  throw new Error('O transporte E2E exige o banco temporário.');
const original = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname !== 'partner.shopeemobile.com') return original(input, init);
  if (url.pathname.endsWith('/upload_image'))
    return Response.json({
      error: '',
      response: { image_info: { image_id: 'e2e-uploaded-image' } },
    });
  if ((init?.method ?? 'GET') !== 'GET')
    throw new Error('Escritas Shopee não são permitidas no E2E.');
  const response = url.pathname.endsWith('/get_model_list')
    ? { tier_variation: [], model: [] }
    : url.pathname.endsWith('/get_item_base_info')
      ? {
          item_list: String(url.searchParams.get('item_id_list'))
            .split(',')
            .map((value) => ({
              item_id: Number(value),
              item_sku: `item-${value}`,
              item_name: Number(value) === 101 ? 'Camiseta azul' : 'Camiseta verde',
              description: 'Descrição original',
              category_id: 10,
              condition: 'NEW',
              item_status: 'NORMAL',
              weight: 0.3,
              price_info: [{ original_price: 20, currency: 'BRL' }],
              stock_info_v2: { summary_info: { total_available_stock: 5 } },
              image: { image_id_list: ['original-image'] },
              dimension: { package_length: 10, package_width: 10, package_height: 10 },
              logistic_info: [{ logistic_id: 1, enabled: true, is_free: false }],
              brand: { brand_id: 0, original_brand_name: 'NoBrand' },
              attribute_list: [
                {
                  attribute_id: 100,
                  attribute_value_list: [{ value_id: 30, original_value_name: 'Algodão' }],
                },
              ],
            })),
        }
      : url.pathname.endsWith('/get_category')
        ? {
            category_list: [
              { category_id: 10, original_category_name: 'Categoria atual', has_children: false },
              { category_id: 20, original_category_name: 'Categoria nova', has_children: false },
            ],
          }
        : url.pathname.endsWith('/get_attributes')
          ? {
              attribute_list: [
                {
                  attribute_id: 100,
                  original_attribute_name: 'Material',
                  is_mandatory: true,
                  attribute_value_list: [{ value_id: 30, original_value_name: 'Algodão' }],
                },
              ],
            }
          : null;
  if (!response) throw new Error(`Consulta E2E não prevista: ${url.pathname}`);
  return Response.json({ error: '', response });
};
