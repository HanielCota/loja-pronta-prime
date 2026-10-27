import { randomUUID } from 'node:crypto';
import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { db } from '@/server/db';
import { encryptHottok } from '@/features/hotmart/server/secret';
import { expectNoA11yViolations, signIn } from './support/auth';

const token = randomUUID();
const emails: string[] = [];
const codes: string[] = [];
const password = 'RecoveryTestPassword123!';

test.beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.startsWith('/loja_pronta_test_'))
    throw new Error('An isolated test database is required.');
  await db.$client.query(
    'insert into hotmart_settings(id,encrypted_hottok) values ($1,$2) on conflict(id) do update set encrypted_hottok=excluded.encrypted_hottok',
    ['main', encryptHottok(token)],
  );
});
test.afterAll(async () => {
  await db.$client.query('delete from hotmart_events where product_ucode=any($1::text[])', [codes]);
  await db.$client.query('delete from hotmart_purchases where product_ucode=any($1::text[])', [
    codes,
  ]);
  await db.$client.query(
    'delete from hotmart_product_mappings where product_ucode=any($1::text[])',
    [codes],
  );
  await db.$client.query('delete from public."user" where email=any($1::text[])', [emails]);
  await db.$client.end();
});

async function seed(request: APIRequestContext) {
  const email = `${randomUUID()}@example.invalid`;
  const code = randomUUID();
  const adminEmail = `${randomUUID()}@example.invalid`;
  emails.push(email, adminEmail);
  codes.push(code);
  await auth.api.createUser({
    body: {
      email: adminEmail,
      name: 'Recovery administrator',
      password,
      role: 'admin',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  const response = await request.post('/api/hotmart/webhook', {
    headers: { 'x-hotmart-hottok': token },
    data: {
      id: randomUUID(),
      event: 'PURCHASE_APPROVED',
      creation_date: Date.now() - 1000,
      version: '2.0.0',
      data: {
        buyer: { email, name: 'Recovery buyer' },
        product: { id: 6102550, ucode: code, name: 'Recovery product' },
        purchase: { transaction: randomUUID(), order_date: Date.now() - 86400000 },
      },
    },
  });
  expect(response.status()).toBe(503);
  return { email, code, adminEmail };
}

async function select(page: Page, name: string, label: string, value: string, noJs: boolean) {
  const field = page.locator(name === 'Produto' ? '#expert-access-1' : '#expert-expert-1');
  if (noJs) await field.selectOption(value);
  else {
    await field.click();
    await page.getByRole('option', { name: label, exact: true }).click();
  }
}

for (const mobile of [false, true])
  for (const dark of [false, true]) {
    test(`pending purchase: ${mobile ? 'mobile' : 'desktop'}, ${dark ? 'dark' : 'light'}`, async ({
      page,
      request,
    }) => {
      const fixture = await seed(request);
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      );
      await page.addInitScript(
        (theme) => localStorage.setItem('theme', theme),
        dark ? 'dark' : 'light',
      );
      await signIn(page, fixture.adminEmail, password, '/admin');
      await expect(page.getByRole('link', { name: 'Ver pendências de acesso' })).toBeVisible();
      await page.getByRole('link', { name: 'Ver pendências de acesso' }).click();
      await page.getByLabel('Buscar email, produto ou transação').fill(fixture.email);
      await page.getByRole('button', { name: 'Buscar', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Recovery product' })).toBeVisible();
      await expect(page.getByText('ID Hotmart: 6102550')).toBeVisible();
      await expectNoA11yViolations(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `.data/hotmart-pending-${mobile ? 'mobile' : 'desktop'}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
      await page.getByRole('link', { name: 'Configurar produto', exact: true }).click();
      await expect(page.getByLabel('Código do produto na Hotmart')).toHaveValue(fixture.code);
      await select(page, 'Produto', 'SLL', 'sll', false);
      await select(page, 'Especialista', 'Pri', 'pri', false);
      await page.getByRole('button', { name: 'Cadastrar origem', exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/hotmart\?resultado=configured/);
      await page.getByLabel('Buscar email, produto ou transação').fill(fixture.email);
      await page.getByRole('button', { name: 'Buscar', exact: true }).click();
      await expect(page.getByText('Nenhuma pendência encontrada para essa busca.')).toBeVisible();
      const access = await db.$client.query(
        'select product from student_products join public."user" on public."user".id=student_products.user_id where email=$1',
        [fixture.email],
      );
      expect(access.rows).toEqual([{ product: 'sll' }]);
    });
  }

test('configuration and recovery work without JavaScript; legacy records request real redelivery', async ({
  browser,
  request,
}) => {
  const fixture = await seed(request);
  await db.$client.query(
    'update hotmart_events set event_created_at=null, ordered_at=null where product_ucode=$1',
    [fixture.code],
  );
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await signIn(page, fixture.adminEmail, password, '/admin/hotmart');
    await page.getByLabel('Buscar email, produto ou transação').fill(fixture.email);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByText(/Faltam dados originais/)).toBeVisible();
    await page.getByRole('link', { name: 'Configurar produto', exact: true }).click();
    await select(page, 'Produto', 'SLL', 'sll', true);
    await select(page, 'Especialista', 'Pri', 'pri', true);
    await page.getByRole('button', { name: 'Cadastrar origem', exact: true }).click();
    await page.getByRole('button', { name: 'Tentar recuperar compras' }).click();
    const rows = await db.$client.query('select id from public."user" where email=$1', [
      fixture.email,
    ]);
    expect(rows.rowCount).toBe(0);
    await expect(page.getByText(/Faltam dados originais/)).toBeVisible();
  } finally {
    await context.close();
  }
});
