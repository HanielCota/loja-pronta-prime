import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { closeDatabase, database, PASSWORD } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';

test.afterAll(closeDatabase);
test.setTimeout(180_000);

test('access deadlines and legacy review work across themes, sizes and without JavaScript', async ({
  page,
  browser,
}) => {
  const users: string[] = [];
  try {
    const makeAccount = async (role: 'admin' | 'user') => {
      const email = `e2e-term-${randomUUID()}@teste.com`;
      const { user } = await auth.api.createUser({
        body: {
          email,
          password: PASSWORD,
          name: 'Access review',
          role,
          data: { emailVerified: true, mustChangePassword: false },
        },
      });
      users.push(user.id);
      return { id: user.id, email };
    };
    const admin = await makeAccount('admin'),
      target = await makeAccount('user');
    await database().query("insert into manual_product_grants(user_id,product) values($1,'sll')", [
      target.id,
    ]);
    await database().query("insert into student_products(user_id,product) values($1,'sll')", [
      target.id,
    ]);
    await signIn(page, admin.email, PASSWORD, '/admin/acessos');
    await expect(page.getByRole('heading', { name: /Acessos antigos para revisar/ })).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: new RegExp(target.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      }),
    ).toBeVisible();
    for (const mobile of [false, true]) {
      for (const theme of ['light', 'dark']) {
        await page.setViewportSize(
          mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
        );
        await page.evaluate((value) => localStorage.setItem('theme', value), theme);
        for (const [view, url] of [
          ['review', '/admin/acessos'],
          ['account', `/admin/contas/${target.id}`],
          ['creation', '/admin/contas/nova'],
        ] as const) {
          await page.goto(url);
          if (view === 'creation') {
            await page.getByRole('checkbox', { name: 'SLL' }).check();
            await expect(page.locator('[name="termDate-sll"]')).toBeVisible();
            await expect(page.locator('[name="termDate-loja-pronta"]')).toBeHidden();
          }
          await expectNoA11yViolations(page);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          await page.screenshot({
            path: `.data/access-${view}-${mobile ? 'mobile' : 'desktop'}-${theme}.png`,
            fullPage: true,
          });
        }
      }
    }
    const context = await browser.newContext({
      javaScriptEnabled: false,
      storageState: await page.context().storageState(),
    });
    try {
      const reader = await context.newPage();
      await reader.goto(`/admin/contas/${target.id}`);
      await reader.getByLabel('Prazo do acesso', { exact: true }).selectOption('purchase');
      await reader
        .getByLabel('Data da compra ou do vencimento')
        .fill(new Date().toISOString().slice(0, 10));
      await reader
        .getByLabel('Motivo da alteração')
        .fill('Original receipt checked without JavaScript');
      await reader.getByRole('button', { name: 'Salvar alteração', exact: true }).click();
      await expect(reader.getByText(/Prazo do acesso salvo e alteração registrada/)).toBeVisible();
      const {
        rows: [grant],
      } = await database().query('select expires_at from manual_product_grants where user_id=$1', [
        target.id,
      ]);
      expect(grant.expires_at).toBeTruthy();
      expect(grant.expires_at.getTime()).toBeGreaterThan(Date.now());
      await reader.goto('/admin/acessos');
      await expect(
        reader.getByRole('heading', { name: 'Acessos antigos para revisar (0)' }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
    const studentContext = await browser.newContext();
    try {
      const student = await studentContext.newPage();
      await signIn(student, target.email, PASSWORD, '/admin/acessos');
      expect((await student.goto('/admin/acessos'))?.status()).toBe(404);
    } finally {
      await studentContext.close();
    }
  } finally {
    await database().query('delete from "user" where id=any($1::text[])', [users]);
  }
});
