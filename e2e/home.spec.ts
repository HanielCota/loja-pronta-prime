import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, signIn as submitSignIn } from './support/auth';
import { database, PASSWORD, studentEmail } from './support/students';

async function signIn(page: Page) {
  await submitSignIn(page, studentEmail('inicio'), PASSWORD);
  await expect(page.getByRole('heading', { name: /Você entrou/ })).toBeVisible();
}

test('sem sessão, o início leva pro login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/entrar$/);
});

test('depois de entrar, mostra o início em vez de voltar pro login', async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(studentEmail('inicio'))).toBeVisible();

  await expectNoA11yViolations(page);
});

test('logada, abrir o login leva direto pro início', async ({ page }) => {
  await signIn(page);
  await page.goto('/entrar');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /Você entrou/ })).toBeVisible();
});

test('sair encerra a sessão e volta pro login', async ({ page, context }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect
    .poll(async () => (await context.cookies()).some((c) => c.name.endsWith('session_token')))
    .toBe(false);

  // A sessão acabou de verdade: o início volta a pedir login.
  await page.goto('/');
  await expect(page).toHaveURL(/\/entrar$/);
});

test('conta bloqueada depois de entrar perde o acesso na hora', async ({ page }) => {
  const email = studentEmail('bloqueadadepois');
  await submitSignIn(page, email, PASSWORD);
  await expect(page.getByRole('heading', { name: /Você entrou/ })).toBeVisible();

  // Bloqueio feito direto no banco (sem a API do plugin admin, que encerraria as sessões).
  await database().query(`update "user" set banned = true where email = $1`, [email]);
  await page.goto('/');
  await expect(page).toHaveURL(/\/entrar$/);
});
