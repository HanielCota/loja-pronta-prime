import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { expectNoA11yViolations, signIn } from './support/auth';
import { closeDatabase, database, PASSWORD } from './support/students';
import { seedRecoveredCatalog, fixtureImage } from '../tests/support/recovered-catalog';

const users: string[] = [];
const customers: string[] = [];
const stores: string[] = [];

test.beforeEach(async ({ page }) => {
  await page.route('**/api/presence', (route) => route.fulfill({ status: 204 }));
});

async function account(admin = false) {
  const email = `legacy-${randomUUID()}@example.invalid`;
  const { user } = await auth.api.createUser({
    body: {
      email,
      password: PASSWORD,
      name: admin ? 'Legacy administrator' : 'Legacy student',
      role: admin ? 'admin' : 'user',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  users.push(user.id);
  if (!admin) {
    await database().query(
      "INSERT INTO student_products(user_id,product) VALUES($1,'loja-pronta')",
      [user.id],
    );
    await database().query(
      "INSERT INTO manual_product_grants(user_id,product) VALUES($1,'loja-pronta')",
      [user.id],
    );
  }
  return { id: user.id, email };
}

async function savedStore(owner: { id: string; email: string }, title: string, count = 0) {
  const customerId = randomUUID();
  const id = randomUUID();
  customers.push(customerId);
  stores.push(id);
  await database().query(
    'INSERT INTO legacy_customers(id,user_id,record) VALUES($1,$2,$3::jsonb)',
    [
      customerId,
      owner.id,
      JSON.stringify({ id: customerId, nome: 'Original name', email: owner.email, telefone: null }),
    ],
  );
  const record = {
    id,
    cliente_id: customerId,
    nome: title,
    descricao: 'Saved store description',
    shopee_shop_id: '123456',
    shopee_nome: 'Original Shopee name',
    loja_shopee_vinculada_id: null,
    situacao_entrega: 'entrega_parcial_registrada',
    pendencias: ['Original pending item'],
  };
  await database().query(
    'INSERT INTO legacy_stores(id,customer_id,record) VALUES($1,$2,$3::jsonb)',
    [id, customerId, JSON.stringify(record)],
  );
  for (let index = 0; index < count; index++) {
    const productId = randomUUID();
    await database().query(
      'INSERT INTO legacy_store_products(id,store_id,record) VALUES($1,$2,$3::jsonb)',
      [
        productId,
        id,
        JSON.stringify({
          id: productId,
          loja_id: id,
          titulo: `Saved product ${index + 1}`,
          descricao: '<script>Original text, never executable</script>',
          preco_final: 19.99,
          shopee_item_id: String(1000 + index),
          situacao_publicacao: 'publicado',
          situacao_anuncio_shopee: 'NORMAL',
        }),
      ],
    );
  }
  return id;
}

test.afterEach(async () => {
  await database().query('DELETE FROM "user" WHERE id=ANY($1::text[])', [users.splice(0)]);
  await database().query('DELETE FROM legacy_store_products WHERE store_id=ANY($1::uuid[])', [
    stores,
  ]);
  await database().query('DELETE FROM legacy_stores WHERE id=ANY($1::uuid[])', [stores.splice(0)]);
  await database().query('DELETE FROM legacy_customers WHERE id=ANY($1::uuid[])', [
    customers.splice(0),
  ]);
});
test.afterAll(closeDatabase);

for (const mobile of [false, true])
  for (const dark of [false, true]) {
    test(`previous stores: ${mobile ? 'mobile' : 'desktop'}, ${dark ? 'dark' : 'light'}`, async ({
      page,
    }) => {
      const student = await account();
      const id = await savedStore(student, 'Previous test store', 31);
      await savedStore(student, 'Second test store');
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      );
      await page.addInitScript(
        (theme) => localStorage.setItem('theme', theme),
        dark ? 'dark' : 'light',
      );
      await signIn(page, student.email, PASSWORD, '/loja-pronta');
      await expect(page.getByRole('heading', { name: 'Suas lojas', exact: true })).toBeVisible();
      await page.getByText('Quero montar outra loja', { exact: true }).click();
      await expect(
        page.getByRole('link', { name: 'Começar uma nova loja', exact: true }),
      ).toHaveAttribute('href', '/loja-pronta/conversa');
      await page.getByText('Quero montar outra loja', { exact: true }).click();
      await expect(page.getByRole('link', { name: 'Retomar esta loja', exact: true })).toHaveCount(
        2,
      );
      await expect(
        page.getByRole('heading', { name: 'Montar sua loja aqui', exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole('heading', { name: 'Previous test store', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Second test store', exact: true }),
      ).toBeVisible();
      await expectNoA11yViolations(page);
      await page.screenshot({
        path: `/tmp/legacy-home-${mobile ? 'mobile' : 'desktop'}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
      await page
        .getByRole('link', { name: 'Ver dados salvos', exact: true })
        .and(page.locator(`[href="/loja-pronta/previous-stores/${id}"]`))
        .click();
      await expect(page).toHaveURL(new RegExp(`/loja-pronta/previous-stores/${id}$`));
      await expect(
        page.getByRole('heading', { name: 'Previous test store', exact: true }),
      ).toBeVisible();
      await expect(page.getByText('Entrega parcial registrada', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Abrir loja na Shopee', exact: true }),
      ).toHaveAttribute('href', 'https://shopee.com.br/shop/123456');
      await expect(
        page
          .getByRole('region', { name: 'Produtos salvos (31)', exact: true })
          .getByRole('listitem'),
      ).toHaveCount(30);
      await expectNoA11yViolations(page);
      await page.getByRole('link', { name: 'Próxima', exact: true }).click();
      await expect(
        page
          .getByRole('region', { name: 'Produtos salvos (31)', exact: true })
          .getByRole('listitem'),
      ).toHaveCount(1);
      await page.screenshot({
        path: `/tmp/legacy-store-${mobile ? 'mobile' : 'desktop'}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
      await page.getByRole('link', { name: 'Retomar esta loja', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/loja-pronta/previous-stores/${id}/continue$`));
      await expect(
        page.getByRole('heading', { name: 'Continue sua loja anterior', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(/Seus dados e 31 produtos salvos estão preservados/),
      ).toBeVisible();
      await expect(page.getByText(/Ainda não há uma data de entrega confirmada/)).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Conexão com a Shopee em breve', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Autorizar na Shopee', exact: true }),
      ).toHaveCount(0);
      await expectNoA11yViolations(page);
      await page.screenshot({
        path: `/tmp/legacy-continuation-${mobile ? 'mobile' : 'desktop'}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
      expect(
        (await database().query('SELECT user_id FROM stores WHERE user_id=$1', [student.id]))
          .rowCount,
      ).toBe(0);
    });
  }

test('previous stores can be resumed without JavaScript', async ({ browser, baseURL }) => {
  const student = await account();
  await savedStore(student, 'No JavaScript store', 20);
  const context = await browser.newContext({
    javaScriptEnabled: false,
    ...(baseURL ? { baseURL } : {}),
  });
  const page = await context.newPage();
  try {
    await signIn(page, student.email, PASSWORD, '/loja-pronta');
    await page.getByRole('link', { name: 'Retomar esta loja', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Continue sua loja anterior', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Seus dados e 20 produtos salvos estão preservados/)).toBeVisible();
  } finally {
    await context.close();
  }
});

test('continuation leads to the existing import and scoped review without restarting setup', async ({
  page,
}) => {
  const student = await account();
  const fixture = await seedRecoveredCatalog(database(), student.id);
  customers.push(fixture.customerId);
  stores.push(fixture.storeId);
  await page.route('**/produtos/recovered/*/images/*', (route) =>
    route.fulfill({ contentType: 'image/png', body: fixtureImage }),
  );
  await signIn(
    page,
    student.email,
    PASSWORD,
    `/loja-pronta/previous-stores/${fixture.storeId}/continue`,
  );
  await expect(
    page.getByRole('heading', { name: 'Importe seus produtos antigos', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Escolher produtos para importar', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/previous-stores/${fixture.storeId}/import$`));
  await page
    .getByRole('button', { name: 'Importar selecionados para minha lista', exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/produtos/recovered\\?store=${fixture.storeId}&resultado=imported`),
  );
  await expect(page.getByRole('heading', { name: 'Minha lista (2)', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Revisar produto', exact: true })).toHaveCount(2);
  await expectNoA11yViolations(page);
  await page.goto(`/loja-pronta/previous-stores/${fixture.storeId}/continue`);
  await page.getByRole('link', { name: 'Revisar produtos desta loja', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/produtos/recovered\\?store=${fixture.storeId}$`));
  expect((await page.goto(`/loja-pronta/produtos/recovered?store=${randomUUID()}`))?.status()).toBe(
    404,
  );
  expect(
    (await database().query('SELECT user_id FROM stores WHERE user_id=$1', [student.id])).rowCount,
  ).toBe(0);
});

test('student ownership and blocked account administration preserve current setup', async ({
  page,
}) => {
  const owner = await account();
  const other = await account();
  const admin = await account(true);
  const id = await savedStore(owner, 'Protected original store');
  await signIn(page, other.email, PASSWORD, `/loja-pronta/previous-stores/${id}`);
  await expect(page.getByRole('heading', { name: 'Protected original store' })).toHaveCount(0);
  expect((await page.goto(`/loja-pronta/previous-stores/${id}`))?.status()).toBe(404);
  expect((await page.goto(`/loja-pronta/previous-stores/${id}/continue`))?.status()).toBe(404);
  await database().query('UPDATE "user" SET banned=true WHERE id=$1', [owner.id]);
  await database().query("INSERT INTO store_brand(user_id,name) VALUES($1,'Current setup brand')", [
    owner.id,
  ]);
  await page.context().clearCookies();
  await signIn(page, admin.email, PASSWORD, `/admin/contas/${owner.id}/etapa`);
  await expect(page.getByRole('heading', { name: 'Cadastro anterior', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Protected original store', exact: true }),
  ).toBeVisible();
  await page.goto(`/admin/contas/${owner.id}/previous-stores/${id}`);
  await expect(
    page.getByRole('heading', { name: 'Protected original store', exact: true }),
  ).toBeVisible();
  expect((await page.goto(`/admin/contas/${other.id}/previous-stores/${id}`))?.status()).toBe(404);
  const {
    rows: [state],
  } = await database().query(
    `SELECT b.name,p.first_visited_at FROM store_brand b
    JOIN student_products p ON p.user_id=b.user_id WHERE b.user_id=$1`,
    [owner.id],
  );
  expect(state.name).toBe('Current setup brand');
  expect(state.first_visited_at).toBeNull();
});
