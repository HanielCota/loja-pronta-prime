import { createHash } from 'node:crypto';
import { RateLimiterDrizzle, RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { RATE_LIMITS_PER_MINUTE } from '@/config/auth';
import { db } from '@/server/db';
import { rateLimits } from '@/server/db/schema';

const WINDOW_SECONDS = 60;

export type RateLimitScope = keyof typeof RATE_LIMITS_PER_MINUTE;

function createLimiter(scope: RateLimitScope): RateLimiterDrizzle {
  const options = {
    keyPrefix: `auth:${scope}`,
    points: RATE_LIMITS_PER_MINUTE[scope],
    duration: WINDOW_SECONDS,
  };
  return new RateLimiterDrizzle({
    ...options,
    storeClient: db,
    schema: rateLimits,
    // Se o banco falhar, segue protegendo com um limite em memória em vez de liberar tudo.
    insuranceLimiter: new RateLimiterMemory(options),
  });
}

// Criados no primeiro uso de cada escopo (o build nunca toca no banco) e reaproveitados entre
// recargas do dev. Por escopo: um limite novo funciona sem reiniciar o servidor.
const globalForLimiters = globalThis as unknown as {
  authRateLimiters?: Partial<Record<RateLimitScope, RateLimiterDrizzle>>;
};

function getLimiter(scope: RateLimitScope): RateLimiterDrizzle {
  const limiters = (globalForLimiters.authRateLimiters ??= {});
  return (limiters[scope] ??= createLimiter(scope));
}

/**
 * Conta uma tentativa e diz se ela ainda está dentro do limite do minuto.
 * `identity` é o que está sendo limitado (um email ou um IP).
 */
export async function consumeAttempt(scope: RateLimitScope, identity: string): Promise<boolean> {
  // Só o hash vai pro banco: a identidade pode ser um email.
  const key = createHash('sha256').update(identity).digest('base64url');

  try {
    await getLimiter(scope).consume(key);
    return true;
  } catch (error) {
    if (error instanceof RateLimiterRes) return false;
    throw error;
  }
}
