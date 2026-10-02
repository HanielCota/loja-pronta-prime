import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { PASSWORD, studentEmail } from './support/students';

async function signIn(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('Email da compra').fill(studentEmail('inicio'));
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
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

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
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
