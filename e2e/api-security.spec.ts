import { expect, test } from '@playwright/test';
import { LEADS_ORIGIN } from '@/config/leads';
import { signIn } from './support/auth';
import { PASSWORD, studentEmail } from './support/students';

// As rotas HTTP do Better Auth ficam expostas em /api/auth/*: precisam estar protegidas sozinhas.
const headers = { origin: 'http://localhost:3000' };

test('login, cadastro e senha pela API ficam desligados (só as telas fazem isso)', async ({
  request,
}) => {
  const attempts = [
    ['/api/auth/sign-in/email', { email: studentEmail('aluna'), password: PASSWORD }],
    [
      '/api/auth/sign-up/email',
      { email: studentEmail('invasora'), password: '12345678', name: 'x' },
    ],
    ['/api/auth/request-password-reset', { email: studentEmail('aluna') }],
    ['/api/auth/reset-password', { newPassword: '12345678', token: 'qualquer' }],
    // Conferir a senha pela API seria um jeito de chutar senhas sem o limite da tela.
    ['/api/auth/verify-password', { password: PASSWORD }],
    ['/api/auth/update-session', {}],
  ] as const;

  for (const [path, data] of attempts) {
    const response = await request.post(path, { headers, data });
    expect(response.status(), path).toBe(404);
  }
});

test('criar conta pela API exige sessão de administrador', async ({ request }) => {
  const response = await request.post('/api/auth/admin/create-user', {
    headers,
    data: { email: studentEmail('invasora'), password: '12345678', name: 'x' },
  });
  expect(response.status()).toBe(401);
});

test('o aviso de presença só vale para quem está logada e vem do próprio site', async ({
  request,
  baseURL,
}) => {
  const data = { path: '/sll', device: {} };
  // A origem do próprio app (a suíte roda o servidor numa porta própria).
  const ownSite = { origin: new URL(baseURL ?? '').origin };
  const anonymous = await request.post('/api/presence', { headers: ownSite, data });
  expect(anonymous.status()).toBe(401);
  // O subdomínio pertence à mesma aplicação; a origem é aceita, mas a sessão continua exigida.
  const leadsSite = await request.post('/api/presence', {
    headers: { origin: LEADS_ORIGIN },
    data,
  });
  expect(leadsSite.status()).toBe(401);
  const otherSite = await request.post('/api/presence', {
    headers: { origin: 'https://outro-site.example' },
    data,
  });
  expect(otherSite.status()).toBe(403);
});

test('o aviso de presença guarda a página e recusa caminhos de fora', async ({ page, baseURL }) => {
  await signIn(page, studentEmail('aluna'), PASSWORD, '/perfil');
  await expect(page).toHaveURL(/\/perfil$/);
  const send = (path: string) =>
    page.request.post('/api/presence', {
      headers: { origin: new URL(baseURL ?? '').origin },
      data: { path, device: { screenWidth: 390, theme: 'dark' } },
    });
  expect((await send('/sll/metodo')).status()).toBe(204);
  expect((await send('https://outro-site.example/x')).status()).toBe(400);
});

test('registro de aula exige origem, sessão, acesso SLL e identificadores válidos', async ({
  page,
  request,
  browser,
  baseURL,
}) => {
  const ownSite = { origin: new URL(baseURL ?? '').origin };
  const path = '/api/sll/progress/view';
  const data = {
    trackId: '00000000-0000-4000-8000-000000000001',
    lessonId: '00000000-0000-4000-8000-000000000002',
  };
  expect((await request.post(path, { headers: ownSite, data })).status()).toBe(401);
  expect(
    (
      await request.post(path, { headers: { origin: 'https://outro-site.example' }, data })
    ).status(),
  ).toBe(403);
  const noAccess = await browser.newContext();
  try {
    const student = await noAccess.newPage();
    await signIn(student, studentEmail('semproduto'), PASSWORD);
    expect((await student.request.post(path, { headers: ownSite, data })).status()).toBe(403);
  } finally {
    await noAccess.close();
  }
  await signIn(page, studentEmail('sosll'), PASSWORD, '/sll');
  expect(
    (
      await page.request.post(path, {
        headers: ownSite,
        data: { trackId: 'inválido', lessonId: 'inválido' },
      })
    ).status(),
  ).toBe(400);
  expect((await page.request.post(path, { headers: ownSite, data })).status()).toBe(409);
  expect(
    (
      await page.request.post(path, { headers: ownSite, data: { padding: 'a'.repeat(4096) } })
    ).status(),
  ).toBe(413);
});
