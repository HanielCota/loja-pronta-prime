import { createHash } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { env } from '@/config/env';
import { authEmailMessage } from '@/features/auth/email-message';
import type { AuthEmailKind } from '@/features/auth/email-message';

type AuthEmail = {
  to: string;
  url: string;
};

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 10_000;

/** O nome do erro ajuda no log sem expor email, token ou mensagem bruta do provedor. */
class EmailDeliveryError extends Error {
  constructor(code: string) {
    super('Não foi possível enviar o email de acesso.');
    this.name = `EmailDeliveryError:${code}`;
  }
}

/**
 * Fora de produção, `EMAIL_DELIVERY=log` registra o link em vez de enviar, mesmo com o Resend
 * configurado no `.env.local`: os testes automáticos usam endereços inventados (de domínios que
 * existem) e não podem mandar emails de verdade. Em produção é ignorado.
 */
function deliveryDisabled() {
  return process.env.NODE_ENV !== 'production' && process.env.EMAIL_DELIVERY === 'log';
}

async function deliver(kind: AuthEmailKind, { to, url }: AuthEmail): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || deliveryDisabled()) {
    if (process.env.NODE_ENV === 'production') throw new EmailDeliveryError('not_configured');
    // Sem credenciais em dev, continua possível testar o acesso sem enviar emails reais.
    console.info(`[auth] link de ${kind} (só em dev): ${url}`);
    return;
  }

  const message = authEmailMessage(kind, url);
  // O mesmo link tem a mesma chave em todas as tentativas, sem carregar dados da aluna.
  const idempotencyKey = createHash('sha256').update(`${kind}\n${to}\n${url}`).digest('hex');

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      // A API é chamada diretamente para nunca registrar mensagens cruas do provedor.
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          from: `Loja Pronta Prime <${env.EMAIL_FROM}>`,
          to: [to],
          ...message,
          ...(env.EMAIL_REPLY_TO ? { reply_to: env.EMAIL_REPLY_TO } : {}),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      if (attempt === MAX_ATTEMPTS - 1) throw new EmailDeliveryError('network_error');
      await setTimeout(1000 * 2 ** attempt);
      continue;
    }

    if (response.ok) {
      const data: unknown = await response.json().catch(() => null);
      if (
        data &&
        typeof data === 'object' &&
        'id' in data &&
        typeof data.id === 'string' &&
        data.id
      )
        return;
      throw new EmailDeliveryError('missing_id');
    }

    await response.body?.cancel();
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS - 1) {
      throw new EmailDeliveryError(`http_${response.status}`);
    }

    // Falhas temporárias ganham tentativas limitadas; permissão e domínio exigem correção.
    await setTimeout(1000 * 2 ** attempt);
  }
}

export function sendPasswordResetEmail(email: AuthEmail): Promise<void> {
  return deliver('password-reset', email);
}

export function sendVerificationEmail(email: AuthEmail): Promise<void> {
  return deliver('verification', email);
}
