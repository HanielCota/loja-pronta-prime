import { expect, test, type Locator } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

test('adicionar ou conectar loja usa um fluxo único e reaproveita a montagem', async ({ page }) => {
  await signIn(page, studentEmail('doisprodutos'), PASSWORD, '/sll');
  await expect(page).toHaveURL(/\/sll$/);

  const mobileMenu = page.getByRole('button', { name: 'Abrir navegação do SLL' });
  let navigationLink: Locator;
  if (await mobileMenu.count()) {
    await mobileMenu.click();
    navigationLink = page
      .getByRole('dialog')
      .getByRole('link', { name: 'Adicionar ou conectar loja' });
  } else {
    navigationLink = page
      .getByRole('region', { name: 'Minha operação' })
      .getByRole('link', { name: 'Adicionar ou conectar loja' });
  }
  await expect(navigationLink).toHaveAttribute('href', '/sll/minhas-lojas/adicionar');
  await navigationLink.click();
  await expect(page).toHaveURL(/\/sll\/minhas-lojas\/adicionar$/);
  await expect(page.getByRole('heading', { name: 'Onde está sua loja?' })).toBeVisible();
  await expect(page.getByText('TikTok Shop')).toBeVisible();
  await expect(page.getByText('Mercado Livre')).toBeVisible();

  await page.goto('/sll/minhas-lojas');
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Adicionar ou conectar loja', exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/sll\/minhas-lojas\/adicionar$/);

  await page.getByRole('link', { name: /Shopee/ }).click();
  await expect(page).toHaveURL(/\/sll\/minhas-lojas\/adicionar\?plataforma=shopee$/);
  await expect(page.getByRole('heading', { name: 'O que você quer fazer?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Conectar uma loja existente' })).toBeVisible();
  await expect(page.getByText('A autorização oficial ainda não está disponível.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Começar na Loja Pronta' })).toHaveAttribute(
    'href',
    '/loja-pronta',
  );
  await expect(page.getByRole('link', { name: /Conectar/ })).toHaveCount(0);
  await expectNoA11yViolations(page);

  await page.getByRole('link', { name: 'Começar na Loja Pronta' }).click();
  await expect(page).toHaveURL(/\/loja-pronta$/);
});

test('mostra a montagem real sem contar como loja conectada', async ({ page }) => {
  await signIn(page, studentEmail('doisprodutosmontagem'), PASSWORD, '/sll/minhas-lojas');

  await expect(page.getByRole('heading', { name: 'Casa da Ana' })).toBeVisible();
  await expect(page.getByText('Em montagem')).toBeVisible();
  await expect(page.getByText('Sua marca')).toBeVisible();
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
