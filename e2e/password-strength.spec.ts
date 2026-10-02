import { expect, test, type Page } from '@playwright/test';
import { signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

const meter = (page: Page) => page.locator('[data-slot="password-strength"]');
/** O leitor de tela ouve só o nível (não a dica a cada tecla). */
const announcement = (page: Page) =>
  page.locator('[aria-live="polite"]').filter({ hasText: /^Força da senha: / });

test('mostra a força da senha ao criar a senha no primeiro acesso', async ({ page }) => {
  const email = studentEmail('forcasenha');
  await signIn(page, email, PASSWORD);
  await expect(page).toHaveURL(/\/primeiro-acesso/);

  const password = page.getByLabel('Senha nova');
  // Antes de digitar, nada aparece.
  await expect(meter(page)).toHaveCount(0);

  // Senha das mais usadas: muito fraca, com o motivo.
  await password.fill('12345678');
  await expect(meter(page)).toContainText('Muito fraca');
  await expect(meter(page)).toContainText('Esta é uma senha muito usada.');
  await expect(announcement(page)).toHaveText('Força da senha: Muito fraca');

  // Parte do próprio email: cai de nível.
  await password.fill(email.split('@')[0]!);
  await expect(meter(page)).not.toContainText(/Boa|Forte/);

  // Frase curta e pouco comum: forte, sem dica.
  await password.fill('minha loja vai bombar');
  await expect(meter(page)).toContainText('Forte');
});

test('o login não mostra nem carrega o medidor de força', async ({ page }) => {
  const dictionaries: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('zxcvbn')) dictionaries.push(request.url());
  });
  await page.goto('/entrar');
  await page.getByLabel('Senha', { exact: true }).fill('qualquer-senha-1');
  // Tudo que a página tinha pra carregar já carregou (o medidor carregaria sob demanda).
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Força da senha')).toHaveCount(0);
  expect(dictionaries).toEqual([]);
});
