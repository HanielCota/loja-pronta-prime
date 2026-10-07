import { describe, expect, test } from 'bun:test';

// Cada cenário importa env em um processo novo, sem credenciais reais ou cache de módulo.
async function loadEmailEnv(values: Record<string, string | undefined>) {
  const child = Bun.spawn(
    [process.execPath, '--no-env-file', '-e', "await import('./src/config/env.ts')"],
    {
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: 'postgres://test:test@localhost:5432/test',
        BETTER_AUTH_SECRET: 'test-secret-with-at-least-32-characters',
        BETTER_AUTH_URL: 'https://app.example.invalid',
        TRUSTED_PROXY_HOPS: '1',
        S3_BUCKET: 'test',
        S3_ACCESS_KEY_ID: 'test',
        S3_SECRET_ACCESS_KEY: 'test',
        NODE_ENV: 'production',
        NEXT_PHASE: undefined,
        RESEND_API_KEY: undefined,
        EMAIL_FROM: undefined,
        EMAIL_REPLY_TO: undefined,
        ...values,
      },
    },
  );
  const stderr = await new Response(child.stderr).text();
  return { code: await child.exited, stderr };
}

describe('configuração de email no servidor', () => {
  test('aceita chave e remetente juntos, com suporte opcional', async () => {
    expect(
      (await loadEmailEnv({ RESEND_API_KEY: 're_test-key', EMAIL_FROM: 'acesso@example.invalid' }))
        .code,
    ).toBe(0);
    expect((await loadEmailEnv({})).code).toBe(0);
  });

  test('recusa configuração parcial e mostra só o nome da variável', async () => {
    const withoutSender = await loadEmailEnv({ RESEND_API_KEY: 're_private-test-key' });
    expect(withoutSender.code).not.toBe(0);
    expect(withoutSender.stderr).toContain('EMAIL_FROM');
    expect(withoutSender.stderr).not.toContain('re_private-test-key');
    const withoutKey = await loadEmailEnv({ EMAIL_FROM: 'acesso@example.invalid' });
    expect(withoutKey.code).not.toBe(0);
    expect(withoutKey.stderr).toContain('RESEND_API_KEY');
  });

  test('recusa remetente ou endereço de resposta inválidos', async () => {
    const credentials = { RESEND_API_KEY: 're_test-key', EMAIL_FROM: 'acesso@example.invalid' };
    expect((await loadEmailEnv({ ...credentials, EMAIL_FROM: 'not-an-email' })).code).not.toBe(0);
    expect((await loadEmailEnv({ ...credentials, EMAIL_REPLY_TO: 'not-an-email' })).code).not.toBe(
      0,
    );
  });

  test('build continua sem depender de credenciais de envio', async () => {
    expect(
      (await loadEmailEnv({ NEXT_PHASE: 'phase-production-build', RESEND_API_KEY: 're_test-key' }))
        .code,
    ).toBe(0);
  });
});
