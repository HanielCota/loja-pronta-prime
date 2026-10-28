import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { closeDatabase, database, PASSWORD, studentEmail } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';

test.afterAll(closeDatabase);
test.setTimeout(240_000);

async function createAccount(kind: string, role: 'user' | 'admin' = 'user') {
  const email = studentEmail(kind);
  await auth.api.createUser({
    body: {
      email,
      password: PASSWORD,
      name: 'Support test',
      role,
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  return email;
}

test('retired ticket URLs lead to WhatsApp help and cannot accept new messages', async ({
  page,
}) => {
  const email = await createAccount('retired-ticket-member');
  await signIn(page, email, PASSWORD, '/perfil');
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Email do suporte/ })).toHaveCount(0);
  await page.goto('/privacidade');
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.getByText('Contato pelo WhatsApp em breve')).toHaveCount(2);
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
  await page.goto('/perfil');
  for (const mobile of [false, true]) {
    for (const dark of [false, true]) {
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      );
      await page.evaluate((theme) => localStorage.setItem('theme', theme), dark ? 'dark' : 'light');
      await page.reload();
      await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
      await expectNoA11yViolations(page);
      await page.screenshot({
        path: `.data/whatsapp-profile-${mobile ? 'mobile' : 'desktop'}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
    }
  }

  const before = (await database().query('select count(*)::int as total from support_tickets'))
    .rows[0].total;
  for (const path of ['/suporte', '/suporte/novo', '/suporte/123']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/perfil#suporte$/);
    await expect(page.getByRole('heading', { name: 'Chamados de suporte' })).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Sua conta' }).click();
  await expect(page.getByRole('menuitem', { name: 'Meus chamados' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Suporte no WhatsApp' })).toBeVisible();
  for (const path of [
    '/api/suporte/acesso',
    '/api/suporte/chamados',
    '/api/suporte/chamados/123/mensagens',
  ]) {
    const response = await page.request.post(path, {
      multipart: { mensagem: 'This must never create a ticket.' },
    });
    expect(response.status()).toBe(410);
  }
  for (const path of ['/api/suporte/anexos/old-file', '/admin/chamados/exportar']) {
    expect((await page.request.get(path)).status()).toBe(410);
  }
  expect(
    (await database().query('select count(*)::int as total from support_tickets')).rows[0].total,
  ).toBe(before);
});

test('administrators retain WhatsApp settings and public help works in both themes and sizes', async ({
  page,
  browser,
}) => {
  const email = await createAccount('whatsapp-settings-admin', 'admin');
  await signIn(page, email, PASSWORD, '/admin/suporte');
  await expect(page.getByRole('heading', { name: 'Contatos por assunto' })).toBeVisible();
  for (const label of ['Chamados', 'Desempenho', 'Equipe']) {
    await expect(page.getByRole('link', { name: label, exact: true })).toHaveCount(0);
  }
  await page.getByLabel('WhatsApp de Mylena').fill('11999991234');
  await page.getByRole('button', { name: 'Salvar contatos' }).click();
  await expect(
    page.getByText('Contatos de suporte salvos.', { exact: true }).first(),
  ).toBeVisible();
  for (const path of [
    '/admin/chamados',
    '/admin/chamados/123',
    '/admin/suporte/desempenho',
    '/admin/suporte/equipe',
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/suporte\/configuracoes#whatsapp$/);
  }
  const context = await browser.newContext();
  const publicHelp = await context.newPage();
  const privacy = await context.newPage();
  await privacy.goto('/privacidade');
  await expect(privacy.getByRole('link', { name: /Falar no WhatsApp/ })).toHaveCount(2);
  await expect(privacy.locator('a[href^="mailto:"]')).toHaveCount(0);
  for (const link of await privacy.getByRole('link', { name: /Falar no WhatsApp/ }).all()) {
    await expect(link).toHaveAttribute('href', /^https:\/\/wa.me\/5511999991234\?text=/);
  }
  try {
    await publicHelp.goto('/suporte/acesso');
    await expect(publicHelp.getByRole('link', { name: /Chamar Mylena no WhatsApp/ })).toBeVisible();
    await expect(publicHelp.getByRole('button', { name: 'Enviar pedido de ajuda' })).toHaveCount(0);
    const whatsapp = await publicHelp.request.get('/suporte/whatsapp/technical?origem=login', {
      maxRedirects: 0,
    });
    expect(whatsapp.status()).toBe(302);
    expect(whatsapp.headers().location).toMatch(/^https:\/\/wa.me\/5511999991234\?/);
    for (const mobile of [false, true]) {
      for (const dark of [false, true]) {
        for (const target of [page, publicHelp, privacy]) {
          await target.setViewportSize(
            mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
          );
          await target.evaluate(
            (theme) => localStorage.setItem('theme', theme),
            dark ? 'dark' : 'light',
          );
          await target.reload();
          await expectNoA11yViolations(target);
          expect(
            await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          await target.screenshot({
            path: `.data/whatsapp-${target === page ? 'admin' : target === privacy ? 'privacy' : 'public'}-${mobile ? 'mobile' : 'desktop'}-${dark ? 'dark' : 'light'}.png`,
            fullPage: true,
          });
        }
      }
    }
    await publicHelp.goto('/suporte/acesso/old-token');
    await expect(publicHelp).toHaveURL(/\/suporte\/acesso$/);
  } finally {
    await context.close();
  }
});

test('WhatsApp help and contact editing work without JavaScript', async ({ browser }) => {
  const email = await createAccount('whatsapp-no-js-admin', 'admin');
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await signIn(page, email, PASSWORD, '/admin/suporte');
    await page.getByLabel('WhatsApp de Mylena').fill('11999994321');
    await page.getByRole('button', { name: 'Salvar contatos' }).click();
    await expect(
      page.getByText('Contatos de suporte salvos.', { exact: true }).first(),
    ).toBeVisible();
    await page.goto('/suporte/acesso');
    await expect(page.getByRole('link', { name: /Chamar Mylena no WhatsApp/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Redefinir minha senha' })).toBeVisible();
    await page.goto('/privacidade');
    await expect(page.getByRole('link', { name: /Falar no WhatsApp/ })).toHaveCount(2);
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
    for (const link of await page.getByRole('link', { name: /Falar no WhatsApp/ }).all()) {
      await expect(link).toHaveAttribute('href', /^https:\/\/wa.me\/5511999994321\?text=/);
    }
  } finally {
    await context.close();
  }
});
