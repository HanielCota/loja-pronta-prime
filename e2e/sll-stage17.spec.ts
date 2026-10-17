import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

test('adicionar ou conectar loja usa um fluxo único e reaproveita a montagem', async ({ page }) => {
  await signIn(page, studentEmail('doisprodutos'), PASSWORD, '/sll');
  await expect(page).toHaveURL(/\/sll$/);

  const mobileMenu = page.getByRole('button', { name: /Seções do SLL/ });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
  await page
    .getByRole('link', { name: 'Minhas Lojas', exact: true })
    .filter({ visible: true })
    .click();
  await page.getByRole('link', { name: 'Ver opções para minha loja', exact: true }).click();
  await expect(page).toHaveURL(/\/sll\/minhas-lojas\/adicionar$/);
  await expect(page.getByRole('heading', { name: 'Onde está sua loja?' })).toBeVisible();
  await expect(page.getByText('TikTok Shop')).toBeVisible();
  await expect(page.getByText('Mercado Livre')).toBeVisible();

  await page.goto('/sll/minhas-lojas');
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Ver opções para minha loja', exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/sll\/minhas-lojas\/adicionar$/);

  await page.getByRole('link', { name: /Shopee/ }).click();
  await expect(page).toHaveURL(/\/sll\/minhas-lojas\/adicionar\?plataforma=shopee$/);
  await expect(page.getByRole('heading', { name: 'O que você quer fazer?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Conectar uma loja existente' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Cadastrar ou conectar minha loja' }),
  ).toHaveAttribute('href', '/sll/minhas-lojas/conectar');
  await expect(page.getByRole('link', { name: 'Começar na Loja Pronta' })).toHaveAttribute(
    'href',
    '/loja-pronta',
  );

  await expectNoA11yViolations(page);

  await page.getByRole('link', { name: 'Começar na Loja Pronta' }).click();
  await expect(page).toHaveURL(/\/loja-pronta$/);
});

test('mostra a montagem real sem contar como loja conectada', async ({ page }) => {
  await signIn(page, studentEmail('doisprodutosmontagem'), PASSWORD, '/sll/minhas-lojas');

  await expect(page.getByRole('heading', { name: 'Casa da Ana' })).toBeVisible();
  await expect(page.getByText('Em montagem')).toBeVisible();
  await expect(page.getByText('Sua marca', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continuar montagem' })).toHaveAttribute(
    'href',
    '/loja-pronta',
  );
  await expect(page.getByRole('heading', { name: 'Nenhuma loja em montagem' })).toHaveCount(0);
  await expectNoA11yViolations(page);
});

test('não abre painel por uma URL direta desconhecida', async ({ page }) => {
  await signIn(page, studentEmail('doisprodutosrota'), PASSWORD, '/sll');
  await expect(page).toHaveURL(/\/sll$/);
  await page.goto('/sll/minhas-lojas/id-de-outra-loja');

  await expect(page.getByRole('heading', { name: 'Essa página não existe' })).toBeVisible();
});
