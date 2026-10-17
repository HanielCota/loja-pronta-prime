import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { encryptShopeeToken } from '@/lib/shopee-protocol';
import { publicationPayloadSchema } from '@/features/assistant/model';
import { assertTestDatabase } from './support/cleanup';
import { closeDatabase, database, PASSWORD } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';
import { ASSISTANT_TEST_CONFIGURATION as settings } from './support/assistant-fixtures';

const run = randomUUID(),
  supplierId = `e2e-${run}`;
const accounts = new Map<string, { id: string; email: string; sku: string }>();
test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => {
  assertTestDatabase();
  let index = 0;
  for (const kind of ['desktop-light', 'desktop-dark', 'mobile-light', 'mobile-dark']) {
    const email = `e2e-publication-${run}-${kind}@teste.com`;
    const { user } = await auth.api.createUser({
      body: {
        email,
        password: PASSWORD,
        name: 'Teste publicação',
        role: 'user',
        data: { emailVerified: true, mustChangePassword: false },
      },
    });
    const shopId = 88900000 + index++;
    const owner = `shopee:live:123:${user.id}:${shopId}`;
    accounts.set(kind, { id: user.id, email, sku: `${user.id}-0` });
    await database().query(
      "insert into student_products(user_id,product) values($1,'loja-pronta')",
      [user.id],
    );
    await database().query('insert into stores(user_id,phase) values($1,5)', [user.id]);
    await database().query(
      'insert into shopee_connections(user_id,shop_id,application_id,access_token_encrypted,refresh_token_encrypted,access_token_expires_at) values($1,$2,$3,$4,$5,$6)',
      [
        user.id,
        shopId,
        'live:123',
        encryptShopeeToken('e2e-access', settings.SHOPEE_TOKEN_ENCRYPTION_KEY, owner),
        encryptShopeeToken('e2e-refresh', settings.SHOPEE_TOKEN_ENCRYPTION_KEY, owner),
        new Date(Date.now() + 3600000),
      ],
    );
    for (let item = 0; item < 5; item++) {
      const sku = `${user.id}-${item}`;
      const product = {
        supplierId,
        sku,
        title: `Produto ${item + 1}`,
        description: 'Descrição do teste',
        images: ['https://example.invalid/image.jpg'],
        costCents: 1000,
        priceCents: 2000,
        stock: 10,
        weightGrams: 200,
        dimensionsCm: { length: 10, width: 10, height: 10 },
        updatedAt: new Date().toISOString(),
        variants: [],
      };
      const payload = publicationPayloadSchema.parse({
        item_name: product.title,
        description: product.description,
        category_id: item % 2 ? 20 : 10,
        item_sku: sku,
        original_price: 20,
        normal_stock: 2,
        weight: 0.2,
        condition: 'NEW',
        item_status: 'NORMAL',
        image: { image_id_list: ['test-image'] },
        dimension: { package_length: 10, package_width: 10, package_height: 10 },
        logistic_info: [{ logistic_id: 1, enabled: true, is_free: false }],
        brand: { brand_id: 0, original_brand_name: 'NoBrand' },
      });
      await database().query(
        'insert into supplier_catalog(supplier_id,sku,product,updated_at) values($1,$2,$3,now())',
        [supplierId, sku, JSON.stringify(product)],
      );
      await database().query(
        'insert into supplier_publication_mappings(user_id,supplier_id,sku,shop_id,application_id,payload,confirmed_by) values($1,$2,$3,$4,$5,$6,$1)',
        [user.id, supplierId, sku, shopId, 'live:123', JSON.stringify(payload)],
      );
    }
  }
  await mkdir('.data/assistant-publication-screens', { recursive: true });
});
test.afterAll(async () => {
  assertTestDatabase();
  for (const account of accounts.values())
    await database().query('delete from "user" where id=$1', [account.id]);
  await database().query('delete from supplier_catalog where supplier_id=$1', [supplierId]);
  await closeDatabase();
});

for (const size of [
  { name: 'desktop', width: 1440, height: 960 },
  { name: 'mobile', width: 390, height: 844 },
])
  for (const theme of ['light', 'dark']) {
    test(`${size.name} ${theme}: preço visto precisa ser confirmado novamente antes da publicação`, async ({
      page,
    }) => {
      const account = accounts.get(`${size.name}-${theme}`)!;
      await page.setViewportSize(size);
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
      await signIn(page, account.email, PASSWORD, '/loja-pronta/produtos');
      await expect(
        page.getByRole('heading', { name: 'Escolha cinco produtos diferentes' }),
      ).toBeVisible();
      await expect(page.locator('input[name="product"]')).toHaveCount(5);
      await expect(
        page.getByText('10 disponíveis no fornecedor · 2 para publicar', { exact: false }).first(),
      ).toBeVisible();
      await expectNoA11yViolations(page);
      for (const checkbox of await page.locator('input[name="product"]').all())
        await checkbox.check();
      await database().query(
        "update supplier_catalog set product=jsonb_set(product,'{priceCents}','2500') where supplier_id=$1 and sku=$2",
        [supplierId, account.sku],
      );
      await database().query(
        "update supplier_publication_mappings set payload=jsonb_set(payload,'{original_price}','25') where user_id=$1 and sku=$2",
        [account.id, account.sku],
      );
      await page.getByRole('button', { name: 'Confirmar seleção e publicar' }).click();
      await expect(page).toHaveURL(/resultado=unavailable$/);
      expect(
        (
          await database().query('select id from assistant_publication_batches where user_id=$1', [
            account.id,
          ])
        ).rowCount,
      ).toBe(0);
      for (const checkbox of await page.locator('input[name="product"]').all())
        await checkbox.check();
      await page.screenshot({
        path: `.data/assistant-publication-screens/selection-${size.name}-${theme}.png`,
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Confirmar seleção e publicar' }).click();
      await expect(page).toHaveURL(/resultado=queued$/);
      await expect(
        page.getByRole('link', { name: 'Conferir a conexão da Shopee' }),
      ).toHaveAttribute('href', '/loja-pronta/shopee/conectar');
      await expect(
        page.getByRole('heading', { name: 'Seus cinco primeiros produtos' }),
      ).toBeVisible();
      const { rows } = await database().query(
        'select status,payload from assistant_publication_items where user_id=$1',
        [account.id],
      );
      expect(rows).toHaveLength(5);
      expect(rows.every((row) => row.status === 'pending')).toBe(true);
      expect(rows.find((row) => row.payload.item_sku === account.sku)?.payload.original_price).toBe(
        25,
      );
      await expectNoA11yViolations(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
