import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { database, PASSWORD, studentEmail } from './support/students';
import { studentIp } from './support/auth';

async function login(page: Page, email: string, password: string) {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': studentIp(email) });
  await page.getByLabel('Email da compra').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

const alert = (page: Page) => page.locator('[data-slot="alert"]');

test.beforeEach(async ({ page }) => {
  await page.goto('/entrar');
});

test('mostra a tela de login sem cadastro público', async ({ page }) => {
  await expect(page).toHaveTitle('Entrar | Loja Pronta Prime');
  await expect(page.getByRole('heading', { name: 'Sua loja na Shopee começa aqui' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Esqueceu ou não recebeu a senha?' })).toBeVisible();
  await expect(page.getByText(/criar conta/i)).toHaveCount(0);
});

test('não restaura o email antigo quando a aluna já começou a preencher o campo', async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('lojaprontaprime:auth-email', 'email-antigo@teste.com');
    // Foco antes de hidratar: reproduz quem toca no campo enquanto a página ainda carrega.
    const observer = new MutationObserver(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="email"]');
      if (!input) return;
      input.focus();
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto('/entrar');
  const email = page.getByLabel('Email da compra');
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('lojaprontaprime:auth-email')))
    .toBe('');
  await expect(email).toBeFocused();
  await expect(email).toHaveValue('');
  await email.fill('novo-email@teste.com');
  await expect(email).toHaveValue('novo-email@teste.com');
});

test('editar o email lembrado logo ao abrir não duplica o valor digitado', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('lojaprontaprime:auth-email', 'lembrado@teste.com');
  });
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.goto('/entrar');
    const email = page.getByLabel('Email da compra');
    await email.fill('outro-email@teste.com');
    await page.getByLabel('Senha', { exact: true }).fill('senha para continuar');
    await expect(email).toHaveValue('outro-email@teste.com');
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(email).toHaveValue('outro-email@teste.com');
  }
});

test('valida no navegador e foca o primeiro campo com erro', async ({ page }) => {
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Digite o email que você usou na compra')).toBeVisible();
  await expect(page.getByText('Digite sua senha')).toBeVisible();
  await expect(page.getByLabel('Email da compra')).toBeFocused();

  await page.getByLabel('Email da compra').fill('aluna@email');
  await page.getByLabel('Senha', { exact: true }).fill('1234');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Digite um email válido')).toBeVisible();
  await expect(page.getByText('Senha precisa ter no mínimo 8 caracteres')).toBeVisible();
});

test('sugere a correção de email digitado errado', async ({ page }) => {
  const email = page.getByLabel('Email da compra');
  await email.fill('aluna@gmial.com');
  await email.blur();
  await page.getByRole('button', { name: /Você quis dizer aluna@gmail\.com/ }).click();
  await expect(email).toHaveValue('aluna@gmail.com');
});

test('senha errada mostra o erro e mantém o email digitado', async ({ page }) => {
  await page.goto('/entrar?next=%2Fsll');
  await login(page, studentEmail('aluna'), 'senha-errada-1');
  await expect(alert(page)).toContainText('Email ou senha incorretos');
  await expect(alert(page)).toContainText('Lupita');
  await expect(alert(page)).toHaveAttribute('data-mascot-speech', 'true');
  await expect(page.getByLabel('Email da compra')).toHaveValue(studentEmail('aluna'));

  // O próximo passo do balão abre a recuperação real e mantém o destino da aluna.
  const recovery = page.getByRole('link', { name: 'Redefinir minha senha' });
  await expect(recovery).toHaveAttribute('href', '/recuperar-senha?next=%2Fsll');
  await recovery.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/recuperar-senha\?next=%2Fsll$/);
  await expect(page.getByRole('heading', { name: 'Criar uma senha nova' })).toBeVisible();
  await expect(page.getByLabel('Email da compra')).toHaveValue(studentEmail('aluna'));
});

test('email inexistente recebe a mesma mensagem de senha errada', async ({ page }) => {
  await login(page, studentEmail('ninguem'), PASSWORD);
  await expect(alert(page)).toContainText('Email ou senha incorretos');
});

test('conta com email não confirmado', async ({ page }) => {
  await login(page, studentEmail('naoconfirmada'), PASSWORD);
  await expect(alert(page)).toContainText('Confirme seu email primeiro');
});

test('conta desativada', async ({ page }) => {
  await login(page, studentEmail('desativada'), PASSWORD);
  await expect(alert(page)).toContainText('Sua conta foi desativada');
});

test('a senha nunca volta nas respostas do servidor', async ({ page }) => {
  const secret = 'senha-que-nao-pode-vazar-9';
  const actionResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === '/entrar',
  );
  await login(page, studentEmail('aluna'), secret);
  const body = await (await actionResponse).text();
  await expect(alert(page)).toBeVisible();
  expect(body).not.toContain(secret);
});

test('login certo cria a sessão em cookie httpOnly', async ({ page, context }) => {
  await login(page, studentEmail('aluna'), PASSWORD);
  await expect
    .poll(async () => (await context.cookies()).find((c) => c.name.endsWith('session_token')))
    .toMatchObject({ httpOnly: true, sameSite: 'Lax' });
});

test('mostra o aviso de sessão expirada vindo de outra tela', async ({ page }) => {
  await page.goto('/entrar?motivo=sessao-expirada');
  await expect(alert(page)).toContainText('Sessão inválida ou expirada');
});

test('destino pós-login só aceita caminhos internos', async ({ page }) => {
  const nextInput = page.locator('input[name="next"]');
  await page.goto('/entrar?next=%2Fpainel%3Faba%3D1');
  await expect(nextInput).toHaveValue('/painel?aba=1');
  // Inclui caminhos que só viram "//evil.com" depois de normalizados (. e ..).
  const unsafePaths = [
    '//evil.com',
    '/\\evil.com',
    'https://evil.com',
    '/.//evil.com',
    '/..//evil.com',
    '/a/..//evil.com',
    '/%2e//evil.com',
  ];
  for (const unsafe of unsafePaths) {
    await page.goto(`/entrar?next=${encodeURIComponent(unsafe)}`);
    await expect(nextInput).toHaveCount(0);
  }
});

test('bloqueia depois de 5 tentativas em 1 minuto', async ({ page }) => {
  const email = studentEmail(`limite-${Date.now()}`);
  for (let attempt = 1; attempt <= 5; attempt++) {
    await login(page, email, `tentativa-${attempt}-xx`);
    await expect(alert(page)).toContainText('Email ou senha incorretos');
  }
  await login(page, email, 'tentativa-6-xx');
  await expect(alert(page)).toContainText('Aguarde 1 minuto pra tentar novamente');

  // A contagem fica no Postgres (vale entre reinícios e vários servidores), não só em memória.
  // O limite de 5 tentativas usa o par email/IP (o email em si nunca vai pro banco).
  const key = `auth:loginPerEmailAndIp:${createHash('sha256')
    .update(`${email} ${studentIp(email)}`)
    .digest('base64url')}`;
  const { rows } = await database().query<{ blocked: number }>(
    `select count(*)::int as blocked from rate_limits
      where key = $1 and points >= 6 and expire > now()`,
    [key],
  );
  expect(rows[0]?.blocked).toBeGreaterThan(0);
});

test('a orientação para criar a primeira senha é lida junto com o campo', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAccessibleDescription(
    /Primeiro acesso.*link abaixo/,
  );
});
