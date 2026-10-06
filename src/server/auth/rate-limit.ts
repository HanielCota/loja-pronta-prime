import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { RATE_LIMITS_LONG, RATE_LIMITS_PER_MINUTE } from '@/config/auth';
import { db } from '@/server/db';
import { countMemoryAttempt, type MemoryAttempt } from '@/lib/rate-limit-memory';

const MINUTE_SECONDS = 60;
/** Contadores vencidos são apagados de vez em quando (não a cada tentativa). */
const CLEANUP_CHANCE = 0.01;
/** Teto por processo, inclusive quando o banco cai e chegam muitas identidades diferentes. */
const MEMORY_MAX_ENTRIES = 10_000;

type RateLimitScope = keyof typeof RATE_LIMITS_PER_MINUTE | keyof typeof RATE_LIMITS_LONG;

/** O limite e a janela de cada regra (a maioria é por minuto). */
function limitFor(scope: RateLimitScope): { max: number; windowSeconds: number } {
  if (scope in RATE_LIMITS_LONG) return RATE_LIMITS_LONG[scope as keyof typeof RATE_LIMITS_LONG];
  return {
    max: RATE_LIMITS_PER_MINUTE[scope as keyof typeof RATE_LIMITS_PER_MINUTE],
    windowSeconds: MINUTE_SECONDS,
  };
}

/**
 * Conta a tentativa no Postgres numa instrução só: insere ou soma, e recomeça do 1 quando a
 * janela venceu. Por ser uma instrução atômica, pedidos simultâneos nunca leem o mesmo valor
 * (cada um soma em cima do outro), então ninguém passa do limite com rajadas paralelas.
 */
async function countInDatabase(key: string, windowSeconds: number): Promise<number> {
  const result = await db.execute<{ points: number }>(sql`
    insert into rate_limits (key, points, expire)
    values (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    on conflict (key) do update set
      points = case when rate_limits.expire is null or rate_limits.expire <= now()
        then 1 else rate_limits.points + 1 end,
      expire = case when rate_limits.expire is null or rate_limits.expire <= now()
        then excluded.expire else rate_limits.expire end
    returning points
  `);
  if (Math.random() < CLEANUP_CHANCE) {
    void db
      .execute(sql`delete from rate_limits where expire < now() - interval '1 hour'`)
      .catch(() => {});
  }
  return Number(result.rows[0]?.points ?? 0);
}

// Reserva em memória, por processo: se o banco cair, continua limitando em vez de liberar tudo.
// Reaproveitada entre recargas do dev.
const globalForLimits = globalThis as unknown as {
  authRateLimitMemory?: Map<string, MemoryAttempt>;
};

function countInMemory(key: string, windowSeconds: number): number {
  const memory = (globalForLimits.authRateLimitMemory ??= new Map());
  return countMemoryAttempt(memory, key, windowSeconds, MEMORY_MAX_ENTRIES, Date.now());
}

/**
 * Conta uma tentativa e diz se ela ainda está dentro do limite (do minuto, ou da janela longa da
 * regra).
 * `identity` é o que está sendo limitado (um email ou um IP).
 */
export async function consumeAttempt(scope: RateLimitScope, identity: string): Promise<boolean> {
  // Só o hash vai pro banco: a identidade pode ser um email.
  const key = `auth:${scope}:${createHash('sha256').update(identity).digest('base64url')}`;

  const { max, windowSeconds } = limitFor(scope);
  let points: number;
  try {
    points = await countInDatabase(key, windowSeconds);
  } catch (error) {
    console.error(
      `[rate-limit] banco indisponível, usando o limite em memória: ${error instanceof Error ? error.name : String(error)}`,
    );
    points = countInMemory(key, windowSeconds);
  }
  return points <= max;
}

/**
 * Confere vários limites em ordem e para no primeiro estourado, sem contar a tentativa nos
 * seguintes. Devolve a regra estourada (ou `undefined` se passou em todas).
 *
 * A ordem importa: do limite mais apertado pro mais largo. Uma tentativa barrada pelo limite de
 * email + IP não pode subir o contador só do email: senão um único IP enche o teto da conta e
 * trava a dona dela, de qualquer lugar.
 */
export async function consumeAttempts(
  checks: readonly (readonly [RateLimitScope, string | undefined])[],
): Promise<RateLimitScope | undefined> {
  for (const [scope, identity] of checks) {
    // Sem identidade (IP desconhecido): essa regra não se aplica.
    if (identity === undefined) continue;
    if (!(await consumeAttempt(scope, identity))) return scope;
  }
  return undefined;
}
