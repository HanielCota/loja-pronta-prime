import { expect, test, type Page } from '@playwright/test';
import { latestResetToken, PASSWORD, studentEmail } from './support/students';

const alert = (page: Page) => page.locator('[data-slot="alert"]');
const hideEmail = (text: string, email: string) => text.replace(email, '<email>');

async function requestLink(page: Page, email: string) {
  await page.goto('/recuperar-senha');
  await page.getByLabel('Email da compra').fill(email);
  await page.getByRole('button', { name: 'Me enviar o link' }).click();
  await expect(page.getByRole('heading', { name: 'Confere seu email' })).toBeVisible();
}

test('leva o email do login pra recuperação sem colocar na URL', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('Email da compra').fill(studentEmail('aluna'));
  await page.getByRole('link', { name: 'Esqueceu ou não recebeu a senha?' }).click();
  await expect(page).toHaveURL(/\/recuperar-senha$/);
  await expect(page.getByLabel('Email da compra')).toHaveValue(studentEmail('aluna'));
});

test('responde igual exista ou não a conta', async ({ page }) => {
  await requestLink(page, studentEmail('aluna'));
  const existing = hideEmail(await page.locator('main').innerText(), studentEmail('aluna'));

  await requestLink(page, studentEmail('ninguem'));
  const unknown = hideEmail(await page.locator('main').innerText(), studentEmail('ninguem'));

  expect(unknown).toBe(existing);
});

test('ciclo completo: link, senha nova, link usado e login', async ({ page }) => {
  const email = studentEmail('redefinir');
  const newPassword = 'minha loja vai bombar';

  await requestLink(page, email);
  await expect.poll(() => latestResetToken(email)).toBeTruthy();
  const token = await latestResetToken(email);
  const link = `/api/auth/reset-password/${token}?callbackURL=%2Fredefinir-senha`;

  await page.goto(link);
  await expect(page).toHaveURL(/\/redefinir-senha\?token=/);
  await page.getByLabel('Senha nova').fill(newPassword);
  await page.getByRole('button', { name: 'Salvar senha' }).click();
  await expect(page.getByRole('heading', { name: 'Senha criada!' })).toBeVisible();

  await page.goto(link);
  await expect(alert(page)).toContainText('Esse link expirou ou já foi usado');

  await page.goto('/entrar');
  await page.getByLabel('Email da compra').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(alert(page)).toContainText('Email ou senha incorretos');

  await page.getByLabel('Senha', { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect
    .poll(async () =>
      (await page.context().cookies()).some((c) => c.name.endsWith('session_token')),
    )
    .toBe(true);
});

test('link inválido oferece pedir um novo', async ({ page }) => {
  await page.goto('/redefinir-senha?error=INVALID_TOKEN');
  await expect(alert(page)).toContainText('Esse link expirou ou já foi usado');
  await page.getByRole('link', { name: 'Pedir um link novo' }).click();
  await expect(page).toHaveURL(/\/recuperar-senha$/);
});
