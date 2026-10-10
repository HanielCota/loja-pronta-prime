import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { expectNoA11yViolations, signIn } from './support/auth';
import { closeDatabase, PASSWORD, studentEmail } from './support/students';

test.afterAll(closeDatabase);

for (const mobile of [false, true])
  for (const dark of [false, true]) {
    test(`piloto Bling: ${mobile ? 'celular' : 'computador'}, ${dark ? 'escuro' : 'claro'}`, async ({
      page,
    }) => {
      const email = studentEmail(`bling-${mobile}-${dark}`);
      await auth.api.createUser({
        body: {
          email,
          password: PASSWORD,
          name: 'Admin Bling',
          role: 'admin',
          data: { emailVerified: true, mustChangePassword: false },
        },
      });
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      );
      await page.addInitScript(
        (useDark) => localStorage.setItem('theme', useDark ? 'dark' : 'light'),
        dark,
      );
      await signIn(page, email, PASSWORD, '/admin/bling');
      await expect(page.getByRole('heading', { name: 'Conexão em breve' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Autorizar no Bling' })).toHaveCount(0);
      await expectNoA11yViolations(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `.data/bling-${mobile ? 'mobile' : 'desktop'}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
    });
  }

test('aluna não acessa o piloto nem consome callback de autorização', async ({ page }) => {
  const email = studentEmail('bling-student');
  await auth.api.createUser({
    body: {
      email,
      password: PASSWORD,
      name: 'Aluna Bling',
      role: 'user',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  await signIn(page, email, PASSWORD, '/');
  const response = await page.goto('/admin/bling');
  expect(response?.status()).toBe(404);
  const callback = await page.request.get('/api/bling/callback?state=bad&code=bad');
  expect(callback.status()).toBe(404);
});
