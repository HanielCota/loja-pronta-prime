import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

test('o menu da conta leva ao perfil, e o nome novo aparece na hora', async ({ page }) => {
  const email = studentEmail('perfilnome');
  await signIn(page, email, PASSWORD);
  await expect(page.getByRole('heading', { name: /Pra onde vamos/ })).toBeVisible();

  await page.getByRole('button', { name: 'Sua conta' }).click();
  // O menu confirma quem está logada antes de mexer na conta.
  await expect(page.getByRole('menu')).toContainText(email);
  await page.getByRole('menuitem', { name: 'Meu perfil' }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByRole('heading', { name: 'Seu perfil' })).toBeVisible();
  await expectNoA11yViolations(page);

  const name = page.getByLabel('Seu nome');
  await name.fill('');
  await page.getByRole('button', { name: 'Salvar nome' }).click();
  await expect(page.getByText('Digite seu nome')).toBeVisible();

  await name.fill('Maria Clara Souza');
  await page.getByRole('button', { name: 'Salvar nome' }).click();
  await expect(page.locator('p').filter({ hasText: 'Nome salvo' })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Você está em' })
    .getByRole('link', { name: 'Início' })
    .click();
  await expect(page.getByRole('heading', { name: 'Oi, Maria! Pra onde vamos?' })).toBeVisible();
});

test('trocar a senha pede a atual e vale no próximo login', async ({ page }) => {
  const email = studentEmail('perfilsenha');
  await signIn(page, email, PASSWORD);
  await expect(page.getByRole('heading', { name: /Pra onde vamos/ })).toBeVisible();
  await page.goto('/perfil');

  await page.getByLabel('Senha atual').fill('nao-e-a-senha');
  await page.getByLabel('Senha nova').fill('minha loja vai bombar');
  await page.getByRole('button', { name: 'Trocar senha' }).click();
  await expect(page.locator('[data-error-code="wrong_current_password"]')).toBeVisible();

  await page.getByLabel('Senha atual').fill(PASSWORD);
  await page.getByLabel('Senha nova').fill('minha loja vai bombar');
  await page.getByRole('button', { name: 'Trocar senha' }).click();
  await expect(page.locator('p').filter({ hasText: /^Senha trocada/ })).toBeVisible();
  // Os campos ficam vazios depois de salvar.
  await expect(page.getByLabel('Senha atual')).toHaveValue('');

  // A sessão continua; a senha antiga deixa de valer.
  await page.getByRole('button', { name: 'Sua conta' }).click();
  await page.getByRole('menuitem', { name: 'Sair da conta' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await signIn(page, email, 'minha loja vai bombar');
  await expect(page).toHaveURL(/\/$/);
});
