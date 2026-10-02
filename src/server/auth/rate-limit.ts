import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { RATE_LIMITS_PER_MINUTE } from '@/config/auth';
import { db } from '@/server/db';

const WINDOW_SECONDS = 60;
/** Contadores vencidos são apagados de vez em quando (não a cada tentativa). */
const CLEANUP_CHANCE = 0.01;
/** Acima disso, o contador em memória descarta os vencidos antes de crescer mais. */
const MEMORY_PRUNE_SIZE = 10_000;

export type RateLimitScope = keyof typeof RATE_LIMITS_PER_MINUTE;

/**
 * Conta a tentativa no Postgres numa instrução só: insere ou soma, e recomeça do 1 quando a
 * janela venceu. Por ser uma instrução atômica, pedidos simultâneos nunca leem o mesmo valor
 * (cada um soma em cima do outro), então ninguém passa do limite com rajadas paralelas.
 */
async function countInDatabase(key: string): Promise<number> {
  const result = await db.execute<{ points: number }>(sql`
    insert into rate_limits (key, points, expire)
    values (${key}, 1, now() + make_interval(secs => ${WINDOW_SECONDS}))
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
  authRateLimitMemory?: Map<string, { points: number; expire: number }>;
};

function countInMemory(key: string): number {
  const memory = (globalForLimits.authRateLimitMemory ??= new Map());
  const now = Date.now();
  if (memory.size > MEMORY_PRUNE_SIZE) {
    for (const [entryKey, entry] of memory) if (entry.expire <= now) memory.delete(entryKey);
  }
  let entry = memory.get(key);
  if (!entry || entry.expire <= now) {
    entry = { points: 0, expire: now + WINDOW_SECONDS * 1000 };
    memory.set(key, entry);
  }
  entry.points += 1;
  return entry.points;
}

/**
 * Conta uma tentativa e diz se ela ainda está dentro do limite do minuto.
 * `identity` é o que está sendo limitado (um email ou um IP).
 */
export async function consumeAttempt(scope: RateLimitScope, identity: string): Promise<boolean> {
  // Só o hash vai pro banco: a identidade pode ser um email.
  const key = `auth:${scope}:${createHash('sha256').update(identity).digest('base64url')}`;

  let points: number;
  try {
    points = await countInDatabase(key);
  } catch (error) {
    console.error(
      `[rate-limit] banco indisponível, usando o limite em memória: ${(error as Error).name}`,
    );
    points = countInMemory(key);
  }
  return points <= RATE_LIMITS_PER_MINUTE[scope];
}
