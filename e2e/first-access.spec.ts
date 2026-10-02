import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, signIn } from './support/auth';
import { database, latestResetToken, PASSWORD, studentEmail } from './support/students';

const NEW_PASSWORD = 'minha loja vai bombar';
const DESTINATION = '/destino-depois-do-login';

const login = (page: Page, email: string, password: string) =>
  signIn(page, email, password, DESTINATION);

async function mustChangePassword(email: string) {
  const { rows } = await database().query<{ must_change_password: boolean | null }>(
    `select must_change_password from "user" where email = $1`,
    [email],
  );
  return rows[0]?.must_change_password;
}

test('senha temporária: cria a própria senha no primeiro acesso e segue pro destino', async ({
  page,
}) => {
  const email = studentEmail('primeiroacesso');
  await login(page, email, PASSWORD);

  await expect(page).toHaveURL(/\/primeiro-acesso\?next=%2Fdestino-depois-do-login$/);
  await expect(page.getByRole('heading', { name: 'Crie sua senha' })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByLabel('Senha nova').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Salvar e entrar' }).click();
  await expect(page.locator('[data-slot="mascot"]')).toHaveAttribute(
    'data-expression',
    'celebrate',
  );
  await expect(page).toHaveURL(new RegExp(`${DESTINATION}$`));
  expect(await mustChangePassword(email)).toBe(false);

  // A temporária deixou de valer; com a senha nova, vai direto pro destino.
  await page.context().clearCookies();
  await login(page, email, PASSWORD);
  await expect(page.locator('[data-error-code="invalid_credentials"]')).toBeVisible();
  await login(page, email, NEW_PASSWORD);
  await expect(page).toHaveURL(new RegExp(`${DESTINATION}$`));
});

test('não aceita a senha temporária como senha nova', async ({ page }) => {
  const email = studentEmail('primeiroacessosenha');
  await login(page, email, PASSWORD);
  await expect(page).toHaveURL(/\/primeiro-acesso/);

  await page.getByLabel('Senha nova').fill(PASSWORD);
  await page.getByRole('button', { name: 'Salvar e entrar' }).click();
  await expect(page.locator('[data-error-code="same_password"]')).toBeVisible();
  await expect(page).toHaveURL(/\/primeiro-acesso/);
  expect(await mustChangePassword(email)).toBe(true);
});

test('sem sessão, o primeiro acesso volta pro login mantendo o destino', async ({ page }) => {
  await page.goto(`/primeiro-acesso?next=${encodeURIComponent(DESTINATION)}`);
  await expect(page).toHaveURL(/\/entrar\?motivo=sessao-expirada&next=%2Fdestino-depois-do-login$/);
  await expect(page.locator('[data-error-code="session_expired"]')).toBeVisible();
});

test('criar a senha pelo link de "Esqueci a senha" também conta como primeiro acesso', async ({
  page,
}) => {
  const email = studentEmail('primeiroacessoreset');
  await page.goto('/recuperar-senha');
  await page.getByLabel('Email da compra').fill(email);
  await page.getByRole('button', { name: 'Me enviar o link' }).click();
  await expect(page.getByRole('heading', { name: 'Confere seu email' })).toBeVisible();
  await expect.poll(() => latestResetToken(email)).toBeTruthy();

  const token = await latestResetToken(email);
  await page.goto(`/api/auth/reset-password/${token}?callbackURL=%2Fredefinir-senha`);
  await page.getByLabel('Senha nova').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Salvar senha' }).click();
  await expect(page.getByRole('heading', { name: 'Senha criada!' })).toBeVisible();
  expect(await mustChangePassword(email)).toBe(false);

  await login(page, email, NEW_PASSWORD);
  await expect(page).toHaveURL(new RegExp(`${DESTINATION}$`));
});

test('depois de criada a senha, o formulário do primeiro acesso não troca mais a senha', async ({
  browser,
}) => {
  const email = studentEmail('primeiroacessoabas');
  const context = await browser.newContext();
  const first = await context.newPage();
  await login(first, email, PASSWORD);
  await expect(first).toHaveURL(/\/primeiro-acesso/);
  // Segunda aba com o formulário aberto (mesma sessão): é como reenviar a action depois.
  const second = await context.newPage();
  await second.goto(`/primeiro-acesso?next=${encodeURIComponent(DESTINATION)}`);
  await expect(second.getByLabel('Senha nova')).toBeVisible();

  await first.getByLabel('Senha nova').fill(NEW_PASSWORD);
  await first.getByRole('button', { name: 'Salvar e entrar' }).click();
  await expect(first).toHaveURL(new RegExp(`${DESTINATION}$`));

  await second.getByLabel('Senha nova').fill('outra senha que nao vale');
  await second.getByRole('button', { name: 'Salvar e entrar' }).click();
  await expect(second).toHaveURL(new RegExp(`${DESTINATION}$`));
  await context.close();

  // Vale a primeira senha criada, não a da segunda aba.
  const fresh = await browser.newPage();
  await login(fresh, email, 'outra senha que nao vale');
  await expect(fresh.locator('[data-error-code="invalid_credentials"]')).toBeVisible();
  await login(fresh, email, NEW_PASSWORD);
  await expect(fresh).toHaveURL(new RegExp(`${DESTINATION}$`));
  await fresh.close();
});
