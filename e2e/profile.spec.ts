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

test('aparência: automático segue o aparelho, e o escuro fixo continua ao recarregar', async ({
  page,
}) => {
  await signIn(page, studentEmail('perfilnome'), PASSWORD, '/perfil');
  await expect(page).toHaveURL(/\/perfil$/);
  const html = page.locator('html');
  const automatic = page.getByRole('switch', { name: 'Automático' });
  const dark = page.getByRole('switch', { name: 'Tema escuro' });

  // Padrão: automático, seguindo o aparelho (claro aqui).
  await expect(automatic).toBeChecked();
  await expect(dark).not.toBeChecked();
  await expect(html).not.toHaveClass(/\bdark\b/);

  // O aparelho escurece: a página acompanha, e a chave do escuro mostra o que está na tela.
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(dark).toBeChecked();
  await expect(automatic).toBeChecked();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#1f1f22');
  await expectNoA11yViolations(page);

  // Mexer no escuro desliga o automático. A linha inteira é o alvo, não só a bolinha.
  await page.getByText('Fundo escuro, mais confortável à noite.').click();
  await expect(dark).not.toBeChecked();
  await expect(automatic).not.toBeChecked();
  await expect(html).not.toHaveClass(/\bdark\b/);

  // Escuro fixo: vale mesmo com o aparelho claro, e já vem escuro ao recarregar (sem clarão).
  await dark.click();
  await page.emulateMedia({ colorScheme: 'light' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await html.evaluate((root) => root.classList.contains('dark'))).toBe(true);
  await expect(dark).toBeChecked();
  await expect(automatic).not.toBeChecked();

  // De volta ao automático, pelo teclado: segue o aparelho (claro) de novo.
  await automatic.focus();
  await page.keyboard.press('Space');
  await expect(automatic).toBeChecked();
  await expect(html).not.toHaveClass(/\bdark\b/);
  await expect(dark).not.toBeChecked();
});

test('aparência: tamanho do texto, menos animação e mais contraste valem na hora e ao recarregar', async ({
  page,
}) => {
  await signIn(page, studentEmail('perfilnome'), PASSWORD, '/perfil');
  await expect(page).toHaveURL(/\/perfil$/);
  const html = page.locator('html');
  const fontSize = () => html.evaluate((root) => getComputedStyle(root).fontSize);
  const muted = () =>
    html.evaluate((root) => getComputedStyle(root).getPropertyValue('--muted-foreground').trim());
  const normalMuted = await muted();
  await expect(page.getByRole('radio', { name: 'Normal' })).toBeChecked();
  expect(await fontSize()).toBe('16px');

  // Rádios de verdade: pelo teclado, as setas trocam o tamanho, e o app inteiro cresce na hora.
  await page.getByRole('radio', { name: 'Normal' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Grande' })).toBeChecked();
  await expect(html).toHaveAttribute('data-text', 'grande');
  expect(await fontSize()).toBe('18px');
  await page.keyboard.press('ArrowRight');
  await expect(html).toHaveAttribute('data-text', 'maior');
  expect(await fontSize()).toBe('20px');

  const motion = page.getByRole('switch', { name: 'Reduzir animações' });
  const contrast = page.getByRole('switch', { name: 'Mais contraste' });
  await motion.click();
  await expect(html).toHaveAttribute('data-motion', 'reduce');
  await contrast.click();
  await expect(html).toHaveAttribute('data-contrast', 'more');
  expect(await muted()).not.toBe(normalMuted);
  await expectNoA11yViolations(page);
  // Mesmo no maior, nada passa da largura da tela.
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  // Recarrega: os atributos já vêm do script do head, antes do React (sem o texto pular).
  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(
    await html.evaluate((root) => [
      root.getAttribute('data-text'),
      root.getAttribute('data-motion'),
      root.getAttribute('data-contrast'),
    ]),
  ).toEqual(['maior', 'reduce', 'more']);
  await expect(page.getByRole('radio', { name: 'Maior' })).toBeChecked();
  await expect(motion).toBeChecked();
  await expect(contrast).toBeChecked();

  // Tudo de volta ao padrão: sem atributo nenhum.
  await page.locator('label', { hasText: 'Normal' }).click();
  await motion.click();
  await contrast.click();
  await expect(html).not.toHaveAttribute('data-text');
  await expect(html).not.toHaveAttribute('data-motion');
  await expect(html).not.toHaveAttribute('data-contrast');
});
