import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { expectNoA11yViolations, signIn } from './support/auth';
import { closeDatabase, database, PASSWORD, studentEmail } from './support/students';

test.afterAll(closeDatabase);

async function createAccount(kind: string, admin = false) {
  const email = studentEmail(kind);
  const { user } = await auth.api.createUser({
    body: {
      email,
      password: PASSWORD,
      name: `Ana ${kind}`,
      role: admin ? 'admin' : 'user',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  return { id: user.id, email };
}

for (const mobile of [false, true]) {
  for (const dark of [false, true]) {
    const kind = `admin-view-${mobile}-${dark}`;
    test(`contas: ${mobile ? 'celular' : 'computador'}, tema ${dark ? 'escuro' : 'claro'}`, async ({
      page,
    }) => {
      const account = await createAccount(kind, true);
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      );
      await page.addInitScript(
        (useDark) => localStorage.setItem('theme', useDark ? 'dark' : 'light'),
        dark,
      );
      await signIn(page, account.email, PASSWORD, '/admin/contas');
      await expect(page).toHaveURL(/\/admin\/contas$/);
      await page.getByLabel('Buscar por nome ou email').fill(account.email);
      await page.getByRole('button', { name: 'Buscar', exact: true }).click();
      await expect(page.getByRole('heading', { name: '1 encontrada' })).toBeVisible();
      await expectNoA11yViolations(page);
      await page.getByRole('link', { name: new RegExp(`Ana ${kind}`) }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/contas/${account.id}$`));
      await expect(page.getByRole('button', { name: 'Bloquear conta', exact: true })).toHaveCount(
        0,
      );
      await expectNoA11yViolations(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `.data/admin-account-${mobile ? 'mobile' : 'desktop'}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
      // A proteção precisa valer também quando o formulário é enviado diretamente.
      await page.getByLabel('Função', { exact: true }).selectOption('student');
      await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
      await expect(
        page.getByText('Você não pode tirar a sua própria função de admin.'),
      ).toBeVisible();
    });
  }
}

test('editar, liberar produto, desconectar e bloquear uma conta tem efeito real', async ({
  page,
  browser,
}) => {
  const admin = await createAccount('admin-actions', true);
  const target = await createAccount('account-actions');
  const studentContext = await browser.newContext();
  try {
    const studentPage = await studentContext.newPage();
    await signIn(studentPage, target.email, PASSWORD, '/perfil');
    await expect(studentPage).toHaveURL(/\/perfil$/);
    expect((await studentPage.goto('/admin/contas'))?.status()).toBe(404);
    await signIn(page, admin.email, PASSWORD, `/admin/contas/${target.id}`);
    await expect(page.getByRole('heading', { name: 'Resumo', exact: true })).toBeVisible();
    await page.getByLabel('Nome completo').fill('Maria Conta');
    await page.getByLabel('Apelido (opcional)').fill('Mari');
    await page.getByLabel('Email', { exact: true }).fill(admin.email);
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(page.getByText('Esse email já é de outra conta.')).toBeVisible();
    const email = studentEmail('account-edited');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Maria Conta', exact: true })).toBeVisible();
    await expect(page.getByLabel('Email da aluna')).toHaveValue(email);
    await page.getByLabel('Motivo da alteração').fill('Teste da liberação manual');
    await page.getByRole('button', { name: 'Salvar alteração', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Resumo', exact: true })).toContainText('SLL');
    await page.getByRole('button', { name: 'Desconectar de todos os aparelhos' }).click();
    await expect(
      page.getByText('Sessões encerradas. A pessoa vai precisar entrar de novo.'),
    ).toBeVisible();
    await studentPage.goto('/perfil');
    await expect(studentPage).toHaveURL(/\/entrar\?/);
    await page.getByLabel('Motivo do bloqueio').fill('Bloqueio para verificar o acesso');
    await page.getByRole('button', { name: 'Bloquear conta', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Resumo', exact: true })).toContainText(
      'Bloqueada',
    );
    await signIn(studentPage, email, PASSWORD);
    await expect(
      studentPage.getByText(/conta.*desativada|acesso.*desativado/i).first(),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Desbloquear conta', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Resumo', exact: true })).toContainText('Ativa');
    await page.getByLabel('Senha no próximo acesso').selectOption('yes');
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(page.getByText('Alterações salvas.', { exact: true })).toBeVisible();
    await signIn(studentPage, email, PASSWORD);
    await expect(studentPage).toHaveURL(/\/primeiro-acesso/);
    const { rows } = await database().query(
      'select role, preferred_name from "user" where id = $1',
      [target.id],
    );
    expect(rows[0]).toEqual({ role: null, preferred_name: 'Mari' });
  } finally {
    await studentContext.close();
  }
});

test('o formulário da conta salva sem JavaScript', async ({ browser }) => {
  const admin = await createAccount('admin-nojs', true);
  const target = await createAccount('account-nojs');
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await signIn(page, admin.email, PASSWORD, `/admin/contas/${target.id}`);
    await expect(page.getByRole('heading', { name: 'Dados da conta', exact: true })).toBeVisible();
    await page.getByLabel('Nome completo').fill('Conta sem JavaScript');
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Conta sem JavaScript', exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test('criar conta pelo painel: senha temporária, produto e email repetido', async ({
  page,
  browser,
}) => {
  const admin = await createAccount('admin-create', true);
  const newEmail = studentEmail('created-by-admin');
  await signIn(page, admin.email, PASSWORD, '/admin/contas');
  await page.getByRole('link', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/admin\/contas\/nova$/);
  await expectNoA11yViolations(page);

  // Email que já existe: avisa no campo e mantém o que foi digitado.
  await page.getByLabel('Nome completo').fill('Conta Repetida');
  await page.getByRole('textbox', { name: 'Email' }).fill(admin.email);
  await page.getByRole('checkbox', { name: 'SLL' }).check();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('Já existe uma conta com esse email.')).toBeVisible();
  await expect(page.getByLabel('Nome completo')).toHaveValue('Conta Repetida');
  await expect(page.getByRole('checkbox', { name: 'SLL' })).toBeChecked();

  await page.getByRole('textbox', { name: 'Email' }).fill(newEmail);
  await page.getByRole('radio', { name: /senha temporária/ }).check();
  await page.getByRole('textbox', { name: 'Senha temporária' }).fill('temporaria-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/admin\/contas\/[^/]+\?criada=senha$/);
  await expect(
    page.getByText('Conta criada com a senha temporária.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Resumo', exact: true })).toContainText('SLL');

  // Ela entra com a senha temporária e precisa criar outra antes de tudo.
  const studentContext = await browser.newContext();
  try {
    const studentPage = await studentContext.newPage();
    await signIn(studentPage, newEmail, 'temporaria-123');
    await expect(studentPage).toHaveURL(/\/primeiro-acesso/);
  } finally {
    await studentContext.close();
  }
});
