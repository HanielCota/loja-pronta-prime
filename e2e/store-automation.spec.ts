import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { encryptShopeeToken } from '@/lib/shopee-protocol';
import { database, closeDatabase, PASSWORD } from './support/students';
import { assertTestDatabase } from './support/cleanup';
import { signIn, expectNoA11yViolations } from './support/auth';
import { ASSISTANT_TEST_CONFIGURATION as settings } from './support/assistant-fixtures';

const accounts = new Map<string, { id: string; email: string }>();
test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => {
  assertTestDatabase();
  let shopId = 91000000;
  for (const kind of ['desktop-light', 'desktop-dark', 'mobile-light', 'mobile-dark']) {
    const email = `e2e-store-${randomUUID()}@teste.com`;
    const { user } = await auth.api.createUser({
      body: {
        email,
        password: PASSWORD,
        name: 'Teste de anúncios',
        role: 'user',
        data: { emailVerified: true, mustChangePassword: false },
      },
    });
    accounts.set(kind, { id: user.id, email });
    const shop = ++shopId;
    await database().query(
      "insert into student_products(user_id,product) values($1,'sll'),($1,'loja-pronta')",
      [user.id],
    );
    const owner = `shopee:live:123:${user.id}:${shop}`;
    await database().query(
      'insert into shopee_connections(user_id,shop_id,application_id,access_token_encrypted,refresh_token_encrypted,access_token_expires_at) values($1,$2,$3,$4,$5,$6)',
      [
        user.id,
        shop,
        'live:123',
        encryptShopeeToken('e2e-access', settings.SHOPEE_TOKEN_ENCRYPTION_KEY, owner),
        encryptShopeeToken('e2e-refresh', settings.SHOPEE_TOKEN_ENCRYPTION_KEY, owner),
        new Date(Date.now() + 3_600_000),
      ],
    );
    const run = randomUUID();
    await database().query(
      "insert into shopee_collection_runs(id,user_id,shop_id,application_id,status,completed_at,item_count) values($1,$2,$3,'live:123','completed',now(),2)",
      [run, user.id, shop],
    );
    await database().query(
      "insert into shopee_metric_snapshots(run_id,item_id,title,category_id,views,sales) values($1,101,'Camiseta azul',10,100,2),($1,102,'Camiseta verde',10,200,3)",
      [run],
    );
  }
  await mkdir('.data/store-automation-screens', { recursive: true });
});
test.afterAll(async () => {
  for (const account of accounts.values())
    await database().query('delete from "user" where id=$1', [account.id]);
  await closeDatabase();
});

test('prepara um novo anúncio com os valores conferidos e preserva o original', async ({
  page,
}) => {
  const account = accounts.get('desktop-light')!;
  await signIn(page, account.email, PASSWORD, '/sll/anuncios?categoria=20');
  await page.getByRole('combobox', { name: 'O que deseja fazer?' }).click();
  await page.getByRole('option', { name: 'Criar novos anúncios para comparar' }).click();
  await page.getByLabel('Camiseta azul', { exact: true }).check();
  await page.getByLabel('Novo título (opcional)').fill('Camiseta para comparar');
  await page.getByRole('combobox', { name: 'Material (obrigatório)' }).click();
  await page.getByRole('option', { name: 'Algodão' }).click();
  const buffer = await sharp({
    create: { width: 12, height: 12, channels: 3, background: '#ffffff' },
  })
    .png()
    .toBuffer();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'novo.png', mimeType: 'image/png', buffer });
  await page
    .getByLabel('Conferi os anúncios selecionados e autorizo aplicar as alterações preenchidas.')
    .check();
  await page.getByRole('button', { name: 'Confirmar alterações', exact: true }).click();
  await expect(page).toHaveURL(/resultado=queued$/);
  const jobs = await database().query(
    "select payload,status from store_automation_jobs where user_id=$1 and kind='clone'",
    [account.id],
  );
  expect(jobs.rows).toHaveLength(1);
  expect(jobs.rows[0].status).toBe('pending');
  expect(jobs.rows[0].payload.item_id).toBe(101);
  expect(jobs.rows[0].payload.template.item_sku).toMatch(/^lpp-/);
  expect(jobs.rows[0].payload.template.original_price).toBe(20);
  expect(jobs.rows[0].payload.template.normal_stock).toBe(5);
  expect(jobs.rows[0].payload.template.image.image_id_list).toEqual(['e2e-uploaded-image']);
});
for (const size of [
  { name: 'desktop', width: 1440, height: 960 },
  { name: 'mobile', width: 390, height: 844 },
])
  for (const theme of ['light', 'dark']) {
    test(`${size.name} ${theme}: confirma as alterações e cria uma tarefa por anúncio`, async ({
      page,
    }) => {
      const account = accounts.get(`${size.name}-${theme}`)!;
      await page.setViewportSize(size);
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
      await signIn(page, account.email, PASSWORD, '/sll/anuncios?categoria=20');
      await expect(
        page.getByRole('heading', { name: 'Ajustar anúncios', exact: true }),
      ).toBeVisible();
      await page.getByLabel('Camiseta azul', { exact: true }).check();
      await page.getByLabel('Camiseta verde', { exact: true }).check();
      await page.getByLabel('Novo título (opcional)').fill('Camiseta de algodão');
      await page.getByRole('combobox', { name: 'Material (obrigatório)' }).click();
      await page.getByRole('option', { name: 'Algodão' }).click();
      await expectNoA11yViolations(page);
      await page.screenshot({
        path: `.data/store-automation-screens/edit-${size.name}-${theme}.png`,
        fullPage: true,
      });
      await page
        .getByLabel(
          'Conferi os anúncios selecionados e autorizo aplicar as alterações preenchidas.',
        )
        .check();
      await page.getByRole('button', { name: 'Confirmar alterações', exact: true }).click();
      await expect(page).toHaveURL(/resultado=queued$/);
      const jobs = await database().query(
        "select payload,status from store_automation_jobs where user_id=$1 and kind='edit'",
        [account.id],
      );
      expect(jobs.rows).toHaveLength(2);
      for (const job of jobs.rows) {
        expect(job.status).toBe('pending');
        expect(job.payload.item_name).toBe('Camiseta de algodão');
        expect(job.payload.category_id).toBe(20);
        expect(job.payload.attribute_list[0].attribute_value_list[0].value_id).toBe(30);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      ).toBe(false);
      await expectNoA11yViolations(page);
    });
  }
