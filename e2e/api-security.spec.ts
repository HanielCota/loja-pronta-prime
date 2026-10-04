import { expect, test } from '@playwright/test';
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
