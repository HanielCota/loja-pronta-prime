if (!new URL(process.env.DATABASE_URL).pathname.startsWith('/loja_pronta_test_'))
  throw new Error('Shopee authorization verification requires the isolated test database.');

const original = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname !== 'partner.shopeemobile.com') return original(input, init);
  if (url.pathname !== '/api/v2/auth/token/get' || init?.method !== 'POST')
    throw new Error('Unexpected Shopee request in the test.');
  const body = JSON.parse(init.body);
  if (
    body.code !== 'isolated-test-code' ||
    body.partner_id !== 123 ||
    !Number.isSafeInteger(body.shop_id)
  )
    throw new Error('Unexpected token exchange parameters.');
  return Response.json({
    error: '',
    access_token: 'isolated-access',
    refresh_token: 'isolated-refresh',
    expire_in: 3600,
  });
};
