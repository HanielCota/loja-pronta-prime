import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import {
  importedProduct,
  importRecoveredProducts,
} from '@/features/legacy-stores/server/catalog-data';
import {
  reviewRecoveredPublication,
  saveRecoveredPublicationOptions,
} from '@/features/legacy-stores/server/publication-data';
import { fixtureImage, seedRecoveredCatalog } from '../tests/support/recovered-catalog';
import { expectNoA11yViolations, signIn } from './support/auth';
import { closeDatabase, database, PASSWORD } from './support/students';

const catalogPath = '/loja-pronta/produtos/recovered';
const recoveredPath = `${catalogPath}/connect`;
const sllPath = '/sll/minhas-lojas/conectar';
const authorize = (page: Page) => page.getByRole('button', { name: 'Autorizar na Shopee' });

test.afterAll(closeDatabase);

async function signInWithProduct(
  page: Page,
  name: string,
  product: 'loja-pronta' | 'sll',
  path: string,
) {
  if (!new URL(process.env.DATABASE_URL ?? '').pathname.startsWith('/loja_pronta_test_'))
    throw new Error('Shopee authorization verification requires the isolated test database.');
  const email = `${name}@example.com`;
  const { user } = await auth.api.createUser({
    body: {
      email,
      password: PASSWORD,
      name: 'Ana Teste',
      role: 'user',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  await database().query('insert into student_products (user_id, product) values ($1, $2)', [
    user.id,
    product,
  ]);
  await database().query('insert into manual_product_grants (user_id, product) values ($1, $2)', [
    user.id,
    product,
  ]);
  await signIn(page, email, PASSWORD, path);
  await expect(page).toHaveURL(new RegExp(path + '$'));
  await page.route('https://open.shopee.com/auth?**', (route) =>
    route.fulfill({ body: 'Test authorization' }),
  );
  return user.id;
}

async function beginAuthorization(page: Page, shopId: number) {
  const origin = new URL(page.url()).origin;
  await authorize(page).click();
  await page.waitForURL('https://open.shopee.com/auth?**');
  const authorization = new URL(page.url());
  expect(authorization.searchParams.get('partner_id')).toBe('123');
  const callback = new URL(authorization.searchParams.get('redirect_uri')!);
  expect(callback.origin).toBe(origin);
  callback.search = new URLSearchParams({
    state: authorization.searchParams.get('state')!,
    code: 'isolated-test-code',
    shop_id: String(shopId),
  }).toString();
  return callback;
}

async function selectTheme(page: Page, project: string) {
  if (project.endsWith('dark')) {
    await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  } else {
    await expect(page.locator('html')).toHaveClass(/light/);
  }
}

test('recovered products can switch shops before store setup is complete', async ({
  page,
}, info) => {
  test.setTimeout(75_000);
  const index = info.config.projects.findIndex((project) => project.name === info.project.name);
  const firstShop = 456000 + index;
  const secondShop = 457000 + index;
  const userId = await signInWithProduct(
    page,
    `recovered-${info.project.name}`,
    'loja-pronta',
    recoveredPath,
  );
  await selectTheme(page, info.project.name);
  const first = await beginAuthorization(page, firstShop);
  await page.goto(first.toString());
  await expect(page).toHaveURL(/recovered\/connect\?resultado=connected$/);
  await expect(
    page.getByText(`A loja ${firstShop} está vinculada.`, { exact: false }),
  ).toBeVisible();
  const disconnect = page.getByRole('button', { name: 'Desconectar desta plataforma' });
  await expect(disconnect).toHaveAccessibleDescription(/Para trocar de loja/);
  await expectNoA11yViolations(page);

  await database().query('update shopee_connections set revoked_at = now() where user_id = $1', [
    userId,
  ]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Autorize sua loja na Shopee' })).toBeVisible();
  await expect(disconnect).toBeVisible();
  await disconnect.click();
  await expect(page).toHaveURL(/recovered\/connect\?resultado=disconnected$/);
  await expect(disconnect).toHaveCount(0);
  const second = await beginAuthorization(page, secondShop);
  await page.goto(second.toString());
  await expect(
    page.getByText(`A loja ${secondShop} está vinculada.`, { exact: false }),
  ).toBeVisible();
  expect(
    (await database().query('select phase from stores where user_id = $1', [userId])).rowCount,
  ).toBe(0);
});

test('an older authorization returns an SLL-only account to SLL with the expiry notice', async ({
  page,
}, info) => {
  const userId = await signInWithProduct(page, `sll-${info.project.name}`, 'sll', sllPath);
  await selectTheme(page, info.project.name);
  const older = await beginAuthorization(page, 458000);
  await page.goto(sllPath);
  await beginAuthorization(page, 458001);
  await page.goto(older.toString());
  await expect(page).toHaveURL(/sll\/minhas-lojas\/conectar\?resultado=expired$/);
  await expect(
    page.getByText('Essa autorização venceu ou já foi usada.', { exact: false }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
  expect(
    (await database().query('select 1 from shopee_connections where user_id = $1', [userId]))
      .rowCount,
  ).toBe(0);
});

test('reconnecting the same shop removes the old confirmation button', async ({ page }, info) => {
  test.setTimeout(65_000);
  const shopId =
    461000 + info.config.projects.findIndex((project) => project.name === info.project.name);
  const userId = await signInWithProduct(
    page,
    `reauthorize-${info.project.name}`,
    'loja-pronta',
    recoveredPath,
  );
  await selectTheme(page, info.project.name);
  await page.goto((await beginAuthorization(page, shopId)).toString());
  await expect(page.getByRole('heading', { name: 'Loja conectada' })).toBeVisible();

  const pool = database();
  const { storeId, ids } = await seedRecoveredCatalog(pool, userId, 1);
  const productId = ids[0]!;
  await importRecoveredProducts(pool, userId, { storeId, productIds: ids });
  const {
    rows: [connection],
  } = await pool.query<{ authorization_id: string }>(
    'SELECT authorization_id FROM shopee_connections WHERE user_id=$1 AND application_id=$2',
    [userId, 'live:123'],
  );
  const version = randomUUID();
  const saved = await saveRecoveredPublicationOptions(pool, userId, productId, 'live:123', shopId, {
    version,
    shopName: 'Test shop',
    categoryId: 10,
    categories: [{ id: 10, name: 'Calçados' }],
    channels: [{ id: 20, name: 'Entrega' }],
    attributes: [],
    brands: [{ id: 0, name: 'Sem marca' }],
  });
  const imported = await importedProduct(pool, userId, productId);
  const form = new FormData();
  for (const [field, value] of Object.entries({
    optionsVersion: version,
    currentData: 'confirmed',
    'cost-0': '20,00',
    'price-0': '49,90',
    'stock-0': '3',
    'cost-1': '21,00',
    'price-1': '59,90',
    'stock-1': '0',
    weightGrams: '500',
    length: '20',
    width: '12',
    height: '8',
    brandId: '0',
    channelId: '20',
  })) {
    form.set(field, value);
  }

  expect(
    await reviewRecoveredPublication(
      pool,
      userId,
      productId,
      imported!.revision,
      saved!.id,
      {
        applicationId: 'live:123',
        shopId,
        authorizationId: connection!.authorization_id,
      },
      form,
    ),
  ).toBe(true);

  await page.route('**/produtos/recovered/*/images/*', (route) =>
    route.fulfill({ body: fixtureImage, contentType: 'image/png' }),
  );
  const publishPath = `${catalogPath}/${productId}/publish`;
  const confirmation = page.getByRole('button', { name: 'Confirmar e publicar na Shopee' });
  await page.goto(publishPath);
  await expect(confirmation).toBeVisible();
  await page.getByRole('link', { name: 'Gerenciar conexão da Shopee' }).click();
  await page.getByRole('button', { name: 'Desconectar desta plataforma' }).click();
  await expect(page).toHaveURL(/resultado=disconnected$/);
  await page.goto((await beginAuthorization(page, shopId)).toString());
  await expect(page.getByText(`A loja ${shopId} está vinculada.`, { exact: false })).toBeVisible();

  await page.goto(publishPath);
  await expect(page.getByText('A autorização da Shopee mudou.', { exact: false })).toBeVisible();
  await expect(confirmation).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Voltar aos dados e revisar novamente' }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('recovered catalog authorization follows the native form redirect to Shopee', async ({
    page,
  }, info) => {
    const shopId =
      459000 + info.config.projects.findIndex((project) => project.name === info.project.name);
    await signInWithProduct(page, `native-${info.project.name}`, 'loja-pronta', recoveredPath);
    const callback = await beginAuthorization(page, shopId);
    await page.goto(callback.toString());
    await expect(page.getByRole('heading', { name: 'Loja conectada' })).toBeVisible();
  });
});

test('a stalled connection link can be retried with a new document request', async ({
  page,
}, info) => {
  test.setTimeout(65_000);
  const shopId =
    460000 + info.config.projects.findIndex((project) => project.name === info.project.name);
  const userId = await signInWithProduct(
    page,
    `retry-${info.project.name}`,
    'loja-pronta',
    recoveredPath,
  );
  await page.goto((await beginAuthorization(page, shopId)).toString());
  await expect(page.getByRole('heading', { name: 'Loja conectada' })).toBeVisible();
  const { storeId, ids } = await seedRecoveredCatalog(database(), userId, 1);
  await importRecoveredProducts(database(), userId, { storeId, productIds: ids });

  const stalled = Promise.withResolvers<void>();
  await page.route(
    (url) => url.pathname === recoveredPath,
    async (route) => {
      if (route.request().headers().rsc === '1') {
        await stalled.promise;
        await route.abort().catch(() => {});
        return;
      }

      await route.continue();
    },
  );

  try {
    await page.goto(`${catalogPath}/${ids[0]}/publish`);
    await selectTheme(page, info.project.name);
    await page.clock.install();
    await page.getByRole('link', { name: 'Gerenciar conexão da Shopee' }).click();
    await expect(page.getByText('Carregando…', { exact: true })).toBeAttached();
    await page.clock.fastForward(20_001);

    const retry = page.getByRole('link', { name: 'Tentar abrir a página de novo' });
    await expect(retry).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'A página demorou' })).toBeVisible();
    const documentRequest = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === recoveredPath && request.isNavigationRequest(),
    );
    await retry.click();
    await documentRequest;
    await expect(page.getByRole('heading', { name: 'Loja conectada' })).toBeVisible();
  } finally {
    stalled.resolve();
  }
});
