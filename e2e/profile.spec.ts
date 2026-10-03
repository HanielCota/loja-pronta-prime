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
  await expect(
    page.getByRole('navigation', { name: 'Você está em' }).getByText('Seu perfil'),
  ).toBeVisible();
  // O email com que ela entra fica na lista da conta.
  await expect(page.getByRole('region', { name: 'Sua conta' })).toContainText(email);
  await expectNoA11yViolations(page);

  // O formulário abre na própria linha, com o foco já no campo.
  const row = page.getByRole('button', { name: /Como quer ser chamada/ });
  await expect(row).toHaveAttribute('aria-expanded', 'false');
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  const name = page.getByLabel('Seu nome');
  await expect(name).toBeFocused();
  await expectNoA11yViolations(page);

  await name.fill('');
  await page.getByRole('button', { name: 'Salvar nome' }).click();
  await expect(page.getByText('Digite seu nome')).toBeVisible();

  // O nome escolhido vale inteiro na saudação (não só o primeiro).
  await name.fill('Maria Clara');
  await expect(page.getByText('Oi, Maria Clara!')).toBeVisible();
  await page.getByRole('button', { name: 'Salvar nome' }).click();
  // Salvo: a linha fecha, mostra o nome novo e o foco volta pra ela.
  await expect(row).toHaveAttribute('aria-expanded', 'false');
  await expect(row).toBeFocused();
  await expect(row).toContainText('Maria Clara');
  await expect(page.getByRole('heading', { level: 1, name: 'Maria Clara' })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Você está em' })
    .getByRole('link', { name: 'Início' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Oi, Maria Clara! Pra onde vamos?' }),
  ).toBeVisible();
});

test('trocar a senha pede a atual e vale no próximo login', async ({ page }) => {
  const email = studentEmail('perfilsenha');
  await signIn(page, email, PASSWORD);
  await expect(page.getByRole('heading', { name: /Pra onde vamos/ })).toBeVisible();
  await page.goto('/perfil');
  await page.getByRole('button', { name: /^Senha/ }).click();

  await page.getByLabel('Senha atual').fill('nao-e-a-senha');
  await page.getByLabel('Senha nova').fill('minha loja vai bombar');
  await page.getByRole('button', { name: 'Trocar senha' }).click();
  await expect(page.locator('[data-error-code="wrong_current_password"]')).toBeVisible();

  await page.getByLabel('Senha atual').fill(PASSWORD);
  await page.getByLabel('Senha nova').fill('minha loja vai bombar');
  await page.getByRole('button', { name: 'Trocar senha' }).click();
  const row = page.getByRole('button', { name: /^Senha/ });
  await expect(row).toContainText('Senha trocada');
  await expect(row).toHaveAttribute('aria-expanded', 'false');
  // Os campos ficam vazios depois de salvar.
  await row.click();
  await expect(page.getByLabel('Senha atual')).toHaveValue('');
  await row.click();

  // A sessão continua; a senha antiga deixa de valer. O sair fica no fim do perfil.
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await signIn(page, email, 'minha loja vai bombar');
  await expect(page).toHaveURL(/\/$/);
});

test('quem esqueceu a senha atual vai pra recuperação com o email preenchido', async ({ page }) => {
  const email = studentEmail('perfilnome');
  await signIn(page, email, PASSWORD, '/perfil');
  await expect(page).toHaveURL(/\/perfil$/);
  await page.getByRole('button', { name: /^Senha/ }).click();
  await page.getByRole('link', { name: 'Esqueceu a senha atual?' }).click();
  await expect(page).toHaveURL(/\/recuperar-senha\?next=%2Fperfil$/);
  await expect(page.getByLabel('Email da compra')).toHaveValue(email);
});
