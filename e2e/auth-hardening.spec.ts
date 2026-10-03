import { expect, test, type Page } from '@playwright/test';
import { signIn } from './support/auth';
import { latestResetToken, PASSWORD, studentEmail } from './support/students';

const alert = (page: Page) => page.locator('[data-slot="alert"]');

async function fillLogin(page: Page, email: string, password: string) {
  await page.getByLabel('Email da compra').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test('senhas erradas de um lugar não travam a conta pra quem entra de outro', async ({
  browser,
}) => {
  const email = studentEmail('travadaip');

  // Em dev não há proxy na frente: o X-Forwarded-For enviado faz o papel do IP de cada lado.
  const attacker = await browser.newContext({
    extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.7' },
  });
  const page = await attacker.newPage();
  await page.goto('/entrar');
  for (let attempt = 1; attempt <= 5; attempt++) {
    await fillLogin(page, email, `errada-${attempt}-xx`);
    await expect(alert(page)).toContainText('Email ou senha incorretos');
  }
  await fillLogin(page, email, PASSWORD);
  await expect(alert(page)).toContainText('Aguarde 1 minuto');
  await attacker.close();

  const owner = await browser.newContext({
    extraHTTPHeaders: { 'x-forwarded-for': '198.51.100.20' },
  });
  const ownerPage = await owner.newPage();
  await ownerPage.goto('/entrar');
  await fillLogin(ownerPage, email, PASSWORD);
  await expect(ownerPage).toHaveURL(/\/$/);
  await owner.close();
});

test.describe('sem JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('o login funciona e mostra o erro', async ({ page }) => {
    await page.goto('/entrar');
    await fillLogin(page, studentEmail('loginsemjs'), 'senha-errada-xx');
    await expect(alert(page)).toContainText('Email ou senha incorretos');

    await fillLogin(page, studentEmail('loginsemjs'), PASSWORD);
    await expect(page).toHaveURL(/\/$/);
  });
});

test('no primeiro acesso dá pra sair da conta', async ({ page, context }) => {
  await signIn(page, studentEmail('primeiroacessosair'), PASSWORD);
  await expect(page).toHaveURL(/\/primeiro-acesso$/);
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect
    .poll(async () => (await context.cookies()).some((c) => c.name.endsWith('session_token')))
    .toBe(false);
});

test('volta do link de confirmação de email: avisa se deu certo ou se o link venceu', async ({
  page,
}) => {
  await page.goto('/entrar?motivo=email-confirmado');
  await expect(page.getByText('Email confirmado.')).toBeVisible();
  await expect(alert(page)).toHaveCount(0);

  // Better Auth acrescenta ?error= quando o link não vale mais.
  await page.goto('/entrar?motivo=email-confirmado&error=TOKEN_EXPIRED');
  await expect(page.getByText('Email confirmado.')).toHaveCount(0);
  await expect(alert(page)).toContainText('Esse link de confirmação não vale mais');
});

test('redefinir a senha pelo link do email também confirma o email', async ({ page }) => {
  const email = studentEmail('redefinirnaoconfirmada');
  await page.goto('/recuperar-senha?next=%2Fsll');
  await page.getByLabel('Email da compra').fill(email);
  await page.getByRole('button', { name: 'Me enviar o link' }).click();
  await expect.poll(() => latestResetToken(email)).toBeTruthy();

  const token = await latestResetToken(email);
  await page.goto(
    `/api/auth/reset-password/${token}?callbackURL=${encodeURIComponent('/redefinir-senha?next=/sll')}`,
  );
  await expect(page).toHaveURL(/\/redefinir-senha\?.*token=/);
  await page.getByLabel('Senha nova').fill('minha loja vai bombar');
  await page.getByRole('button', { name: 'Salvar senha' }).click();
  await page.getByRole('link', { name: 'Entrar agora' }).click();
  await expect(page).toHaveURL(/\/entrar\?next=%2Fsll$/);

  // Sem "Confirme seu email primeiro": entra direto e segue pro destino.
  await fillLogin(page, email, 'minha loja vai bombar');
  await expect(page).toHaveURL(/\/sll$/);
});

test('falha de rede no login: a tela volta com o aviso e o email digitado', async ({ page }) => {
  await page.goto('/entrar');
  // Derruba só o envio do formulário (a Server Action é um POST pra própria página).
  await page.route('**/entrar', (route) =>
    route.request().method() === 'POST' ? route.abort('internetdisconnected') : route.continue(),
  );
  await fillLogin(page, studentEmail('falharede'), PASSWORD);
  await expect(page.getByText('Não deu pra falar com o servidor')).toBeVisible();
  await expect(page.getByLabel('Email da compra')).toHaveValue(studentEmail('falharede'));

  // Voltou a internet: entra normalmente.
  await page.unroute('**/entrar');
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('logada, a API não deixa trocar o próprio nome', async ({ page }) => {
  await signIn(page, studentEmail('apinome'), PASSWORD);
  await expect(page).toHaveURL(/\/$/);
  const response = await page.request.post('/api/auth/update-user', {
    headers: { origin: 'http://localhost:3000' },
    data: { name: 'Outro nome' },
  });
  expect(response.status()).toBe(404);
});
