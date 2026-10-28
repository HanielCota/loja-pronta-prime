import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';

// Arquivo executado separado: não substitui env nem fetch dos outros testes do projeto.
const emailEnv: { RESEND_API_KEY?: string; EMAIL_FROM?: string; EMAIL_REPLY_TO?: string } = {
  RESEND_API_KEY: 're_test-not-a-real-key',
  EMAIL_FROM: 'acesso@mail.example.invalid',
  EMAIL_REPLY_TO: 'suporte@example.invalid',
};
mock.module('@/config/env', () => ({ env: emailEnv }));
mock.module('node:timers/promises', () => ({ setTimeout: async () => {} }));
const { sendPasswordResetEmail, sendVerificationEmail } = await import('@/server/auth/emails');
const { sendEmailInBackground } = await import('@/server/email/send');

const email = {
  to: 'aluna@example.invalid',
  url: 'https://app.example.invalid/api/auth/reset-password/private-token',
};
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  mock.restore();
  if (originalNodeEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
  else Object.assign(process.env, { NODE_ENV: originalNodeEnv });
  emailEnv.RESEND_API_KEY = 're_test-not-a-real-key';
  emailEnv.EMAIL_FROM = 'acesso@mail.example.invalid';
  emailEnv.EMAIL_REPLY_TO = 'suporte@example.invalid';
});

describe('entrega dos emails de acesso pela Resend', () => {
  test('envia destinatário, texto, remetente, resposta e timeout', async () => {
    const request = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 'email-id' }));
    await sendPasswordResetEmail(email);
    expect(request).toHaveBeenCalledTimes(1);
    const [url, options] = request.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails');
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(String(options?.body));
    expect(body.from).toBe('Escala Shop <acesso@mail.example.invalid>');
    expect(body.to).toEqual([email.to]);
    expect(body.reply_to).toBe('suporte@example.invalid');
    expect(body.text).toContain(email.url);
    expect(body.subject).toContain('senha');
  });

  test('repete falhas temporárias com a mesma chave, sem dados da aluna nos cabeçalhos', async () => {
    const request = spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json({ name: 'rate_limit_exceeded', message: 'limite' }, { status: 429 }),
      )
      .mockResolvedValueOnce(
        Response.json({ name: 'internal_server_error', message: 'falha' }, { status: 503 }),
      )
      .mockResolvedValueOnce(Response.json({ id: 'email-id' }));
    await sendPasswordResetEmail(email);
    expect(request).toHaveBeenCalledTimes(3);
    const keys = request.mock.calls.map(([, options]) =>
      new Headers(options?.headers).get('Idempotency-Key'),
    );
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(keys[0]).not.toContain('private-token');
    expect(keys[0]).not.toContain(email.to);
  });

  test('falha de rede tem tentativas limitadas', async () => {
    const request = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('falha de rede'));
    await expect(sendVerificationEmail(email)).rejects.toMatchObject({
      name: 'EmailDeliveryError:network_error',
    });
    expect(request).toHaveBeenCalledTimes(3);
  });

  test('permissão inválida não é repetida nem expõe a mensagem do provedor', async () => {
    const log = spyOn(console, 'error').mockImplementation(() => {});
    const request = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        { name: 'restricted_api_key', message: `${email.to} ${email.url}` },
        { status: 403 },
      ),
    );
    await expect(sendPasswordResetEmail(email)).rejects.toMatchObject({
      name: 'EmailDeliveryError:http_403',
      message: 'Não foi possível enviar o email de acesso.',
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
  });

  test('sem caixa de suporte, o envio não inventa um endereço de resposta', async () => {
    delete emailEnv.EMAIL_REPLY_TO;
    const request = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 'email-id' }));
    await sendVerificationEmail(email);
    const body = JSON.parse(String(request.mock.calls[0]![1]?.body));
    expect(body.subject).toContain('Confirme seu email');
    expect(body.reply_to).toBeUndefined();
  });

  test('produção sem provedor falha sem imprimir o link', async () => {
    delete emailEnv.RESEND_API_KEY;
    delete emailEnv.EMAIL_FROM;
    Object.assign(process.env, { NODE_ENV: 'production' });
    const log = spyOn(console, 'info').mockImplementation(() => {});
    const request = spyOn(globalThis, 'fetch');
    await expect(sendPasswordResetEmail(email)).rejects.toMatchObject({
      name: 'EmailDeliveryError:not_configured',
    });
    expect(log).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  test('desenvolvimento sem provedor permite testar o link sem envio real', async () => {
    delete emailEnv.RESEND_API_KEY;
    delete emailEnv.EMAIL_FROM;
    Object.assign(process.env, { NODE_ENV: 'development' });
    const log = spyOn(console, 'info').mockImplementation(() => {});
    const request = spyOn(globalThis, 'fetch');
    await sendPasswordResetEmail(email);
    expect(log).toHaveBeenCalledWith(expect.stringContaining(email.url));
    expect(request).not.toHaveBeenCalled();
  });
});

describe('disabled support email delivery', () => {
  test('does not contact the provider even with production credentials', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    const request = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 'email-id' }));
    sendEmailInBackground(
      {
        to: email.to,
        subject: 'Support ticket update',
        text: 'A ticket has changed.',
        idempotencyKey: 'ticket:test:reply',
      },
      'support',
    );
    await Promise.resolve();
    expect(request).not.toHaveBeenCalled();
  });

  test('continues delivering unrelated background emails', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    const request = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 'email-id' }));
    sendEmailInBackground(
      {
        to: email.to,
        subject: 'Account update',
        text: 'Your account has changed.',
        idempotencyKey: 'account:test:update',
      },
      'account',
    );
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
