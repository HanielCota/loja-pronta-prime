import { createHash } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { env } from '@/config/env';

/**
 * Envio de e-mail genérico (o mesmo Resend dos e-mails de acesso), pra avisos que não são de
 * autenticação. Quem chama decide o que fazer com a falha: os avisos do suporte só registram e
 * seguem, nunca derrubam a resposta.
 */

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  /** Mesma chave = mesmo e-mail: o Resend não manda de novo numa nova tentativa. */
  idempotencyKey: string;
};

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 10_000;

export class EmailSendError extends Error {
  constructor(code: string) {
    super('Não foi possível enviar o e-mail.');
    this.name = `EmailSendError:${code}`;
  }
}

function deliveryDisabled() {
  return process.env.NODE_ENV !== 'production' && process.env.EMAIL_DELIVERY === 'log';
}

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || deliveryDisabled()) {
    if (process.env.NODE_ENV === 'production') throw new EmailSendError('not_configured');
    // Em dev, o assunto basta pra conferir o fluxo sem mandar e-mails de verdade.
    console.info(`[email] (só em dev) ${email.subject}`);
    return;
  }

  const idempotencyKey = createHash('sha256').update(email.idempotencyKey).digest('hex');
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          from: `Escala Shop <${env.EMAIL_FROM}>`,
          to: [email.to],
          subject: email.subject,
          text: email.text,
          ...(env.EMAIL_REPLY_TO ? { reply_to: env.EMAIL_REPLY_TO } : {}),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      if (attempt === MAX_ATTEMPTS - 1) throw new EmailSendError('network_error');
      await setTimeout(1000 * 2 ** attempt);
      continue;
    }
    if (response.ok) {
      await response.body?.cancel();
      return;
    }
    await response.body?.cancel();
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS - 1) throw new EmailSendError(`http_${response.status}`);
    await setTimeout(1000 * 2 ** attempt);
  }
}

/** Envia sem esperar e sem deixar a falha subir: o log não leva e-mail nem conteúdo. */
export function sendEmailInBackground(email: OutgoingEmail, tag: string): void {
  void sendEmail(email).catch((error: unknown) => {
    console.error(`[${tag}] e-mail não enviado: ${error instanceof Error ? error.name : 'erro'}`);
  });
}

/** O endereço público do site, pra montar links nos e-mails. */
export function absoluteUrl(path: string): string {
  return new URL(path, env.BETTER_AUTH_URL).toString();
}
