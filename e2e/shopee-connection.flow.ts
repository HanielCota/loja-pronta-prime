import { expect, test, type Page } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { expectNoA11yViolations, signIn } from './support/auth';
import { closeDatabase, database, PASSWORD } from './support/students';

const recoveredPath = '/loja-pronta/produtos/recovered/connect';
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
