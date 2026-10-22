import { randomBytes } from 'node:crypto';
import { effectiveProductAccess } from '@/features/products/server/eligibility';
import { and, eq, gt, isNull, lt, ne } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db } from '@/server/db';
import {
  assistantJobs,
  shopeeAuthorizationStates,
  shopeeConnections,
  stores,
  studentProducts,
} from '@/server/db/schema';
import type { ShopeeEntry } from '../entry';
import {
  decryptShopeeToken,
  encryptShopeeToken,
  hashShopeeAuthorizationState,
} from '@/lib/shopee-protocol';
import {
  buildShopeeAuthorizationUrl,
  shopeeApplicationId,
  shopeeTokenOwner,
  type ShopeeCallback,
  type ShopeeConfiguration,
} from '../authorization';
import { requestShopeeTokens, ShopeeApiError } from './client';

/**
 * Trava de sessão numa conexão reservada: sobrevive aos commits que precedem chamadas externas.
 * Assim, consumo de código e bloqueio de refresh ficam duráveis mesmo se o processo cair.
 */
async function locked<T>(
  userId: string,
  shopId: number | undefined,
  work: (connection: NodePgDatabase<Record<string, unknown>>) => Promise<T>,
) {
  const client = await db.$client.connect();
  const acquired: string[] = [];
  let discard = false;
  try {
    const keys = [`shopee:user:${userId}`, ...(shopId ? [`shopee:shop:${shopId}`] : [])];
    for (const key of keys) {
      await client.query('select pg_advisory_lock(hashtext($1))', [key]);
      acquired.push(key);
    }
    return await work(drizzle(client));
  } finally {
    for (const key of acquired.toReversed()) {
      try {
        await client.query('select pg_advisory_unlock(hashtext($1))', [key]);
      } catch {
        // Uma conexão que pode ter ficado com trava nunca volta para o pool.
        discard = true;
      }
    }
    client.release(discard);
  }
}

export async function beginShopeeAuthorization(
  userId: string,
  sessionId: string,
  config: ShopeeConfiguration,
  applicationUrl: string,
  origin: ShopeeEntry = 'loja-pronta',
) {
  const state = randomBytes(32).toString('hex');
  const url = buildShopeeAuthorizationUrl(config, applicationUrl, state);
  await locked(userId, undefined, (connection) =>
    connection.transaction(async (tx) => {
      await tx
        .delete(shopeeAuthorizationStates)
        .where(lt(shopeeAuthorizationStates.expiresAt, new Date()));
      await tx
        .delete(shopeeAuthorizationStates)
        .where(eq(shopeeAuthorizationStates.userId, userId));
      await tx.insert(shopeeAuthorizationStates).values({
        stateHash: hashShopeeAuthorizationState(state),
        userId,
        sessionId,
        applicationId: shopeeApplicationId(config),
        origin,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
    }),
  );
  return url;
}

export async function finishShopeeAuthorization(
  input: ShopeeCallback & { userId: string; sessionId: string },
  config: ShopeeConfiguration,
  fetcher: typeof fetch = fetch,
) {
  return locked(
    input.userId,
    input.kind === 'authorize' ? input.shopId : undefined,
    async (connection) => {
      const [pending] = await connection
        .select({ origin: shopeeAuthorizationStates.origin })
        .from(shopeeAuthorizationStates)
        .where(
          and(
            eq(shopeeAuthorizationStates.stateHash, hashShopeeAuthorizationState(input.state)),
            eq(shopeeAuthorizationStates.userId, input.userId),
            eq(shopeeAuthorizationStates.sessionId, input.sessionId),
          ),
        );
      if (!pending) return 'expired';
      const [access] = await connection
        .select({ product: studentProducts.product })
        .from(studentProducts)
        .where(
          and(
            eq(studentProducts.userId, input.userId),
            eq(studentProducts.product, pending.origin),
            effectiveProductAccess(),
          ),
        );
      if (!access) return 'expired';
      const [store] = await connection
        .select({ phase: stores.phase })
        .from(stores)
        .where(eq(stores.userId, input.userId));
      if (pending.origin === 'loja-pronta' && (!store || store.phase < 4)) return 'expired';
      // Este UPDATE é confirmado antes da chamada externa: nem uma falha de persistência repete o código.
      const [intent] = await connection
        .update(shopeeAuthorizationStates)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(shopeeAuthorizationStates.stateHash, hashShopeeAuthorizationState(input.state)),
            eq(shopeeAuthorizationStates.userId, input.userId),
            eq(shopeeAuthorizationStates.sessionId, input.sessionId),
            eq(shopeeAuthorizationStates.applicationId, shopeeApplicationId(config)),
            isNull(shopeeAuthorizationStates.consumedAt),
            gt(shopeeAuthorizationStates.expiresAt, new Date()),
          ),
        )
        .returning({ stateHash: shopeeAuthorizationStates.stateHash });
      if (!intent) return 'expired';
      if (input.kind !== 'authorize') return input.kind;
      const [other] = await connection
        .select({ userId: shopeeConnections.userId })
        .from(shopeeConnections)
        .where(
          and(
            eq(shopeeConnections.shopId, input.shopId),
            ne(shopeeConnections.userId, input.userId),
          ),
        );
      if (other) return 'shop-used';
      // Uma reautorização da mesma loja pode invalidar os tokens anteriores mesmo se o salvamento falhar.
      await connection
        .update(shopeeConnections)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(shopeeConnections.userId, input.userId),
            eq(shopeeConnections.shopId, input.shopId),
          ),
        );
      try {
        const tokens = await requestShopeeTokens(
          { kind: 'authorize', code: input.code, shopId: input.shopId },
          fetcher,
          config,
        );
        const owner = shopeeTokenOwner(input.userId, input.shopId, config);
        const values = {
          userId: input.userId,
          shopId: input.shopId,
          applicationId: shopeeApplicationId(config),
          accessTokenEncrypted: encryptShopeeToken(
            tokens.accessToken,
            config.SHOPEE_TOKEN_ENCRYPTION_KEY,
            owner,
          ),
          refreshTokenEncrypted: encryptShopeeToken(
            tokens.refreshToken,
            config.SHOPEE_TOKEN_ENCRYPTION_KEY,
            owner,
          ),
          accessTokenExpiresAt: tokens.expiresAt,
          revokedAt: null,
          updatedAt: new Date(),
        };
        await connection.transaction(async (tx) => {
          await tx
            .insert(shopeeConnections)
            .values(values)
            .onConflictDoUpdate({ target: shopeeConnections.userId, set: values });
          await tx
            .insert(assistantJobs)
            .values({
              userId: input.userId,
              kind: 'collect',
              deduplicationKey: `collect:connection:${input.userId}:${intent.stateHash}`,
            })
            .onConflictDoNothing();
          // Sandbox nunca avança a jornada de uma loja real.
          if (config.SHOPEE_ENVIRONMENT === 'live' && pending.origin === 'loja-pronta')
            await tx
              .update(stores)
              .set({ phase: 5 })
              .where(and(eq(stores.userId, input.userId), eq(stores.phase, 4)));
        });
        return config.SHOPEE_ENVIRONMENT === 'live' ? 'connected' : 'sandbox';
      } catch {
        return 'failed';
      }
    },
  );
}

/** Lê apenas a origem vinculada à dona e sessão, inclusive para devolver erros à área correta. */
export async function getShopeeAuthorizationOrigin(
  userId: string,
  sessionId: string,
  state: string,
) {
  const [intent] = await db
    .select({ origin: shopeeAuthorizationStates.origin })
    .from(shopeeAuthorizationStates)
    .where(
      and(
        eq(shopeeAuthorizationStates.stateHash, hashShopeeAuthorizationState(state)),
        eq(shopeeAuthorizationStates.userId, userId),
        eq(shopeeAuthorizationStates.sessionId, sessionId),
      ),
    );
  return intent?.origin ?? null;
}

/** Só retorna tokens para código de servidor. A tela recebe apenas o estado e o ID da loja. */
export async function readShopeeAccess(
  userId: string,
  config: ShopeeConfiguration,
  fetcher: typeof fetch = fetch,
) {
  return locked(userId, undefined, async (connection) => {
    const [stored] = await connection
      .select()
      .from(shopeeConnections)
      .where(eq(shopeeConnections.userId, userId));
    if (!stored || stored.revokedAt || stored.applicationId !== shopeeApplicationId(config))
      throw new ShopeeApiError('rejected');
    const owner = shopeeTokenOwner(userId, stored.shopId, config);
    let accessToken: string;
    let refreshToken: string;
    try {
      accessToken = decryptShopeeToken(
        stored.accessTokenEncrypted,
        config.SHOPEE_TOKEN_ENCRYPTION_KEY,
        owner,
      );
      refreshToken = decryptShopeeToken(
        stored.refreshTokenEncrypted,
        config.SHOPEE_TOKEN_ENCRYPTION_KEY,
        owner,
      );
    } catch {
      throw new ShopeeApiError('rejected');
    }
    if (stored.accessTokenExpiresAt.getTime() <= Date.now() + 60_000) {
      // Confirma o bloqueio antes de usar o refresh de uso único. Queda ou timeout exigem reconexão.
      await connection
        .update(shopeeConnections)
        .set({ revokedAt: new Date() })
        .where(eq(shopeeConnections.userId, userId));
      try {
        const tokens = await requestShopeeTokens(
          { kind: 'refresh', refreshToken, shopId: stored.shopId },
          fetcher,
          config,
        );
        await connection
          .update(shopeeConnections)
          .set({
            accessTokenEncrypted: encryptShopeeToken(
              tokens.accessToken,
              config.SHOPEE_TOKEN_ENCRYPTION_KEY,
              owner,
            ),
            refreshTokenEncrypted: encryptShopeeToken(
              tokens.refreshToken,
              config.SHOPEE_TOKEN_ENCRYPTION_KEY,
              owner,
            ),
            accessTokenExpiresAt: tokens.expiresAt,
            revokedAt: null,
          })
          .where(eq(shopeeConnections.userId, userId));
        accessToken = tokens.accessToken;
      } catch {
        throw new ShopeeApiError('rejected');
      }
    }
    return { shopId: stored.shopId, accessToken };
  });
}

export async function getShopeeStatus(userId: string, config: ShopeeConfiguration) {
  try {
    const { shopId } = await readShopeeAccess(userId, config);
    return { connected: true as const, shopId };
  } catch (error) {
    if (!(error instanceof ShopeeApiError)) throw error;
    return { connected: false as const };
  }
}

/** A remoção local não revoga autorizações de outros sistemas que usam o mesmo aplicativo. */
export async function removeShopeeConnection(userId: string) {
  await locked(userId, undefined, (connection) =>
    connection.transaction(async (tx) => {
      await tx.delete(shopeeConnections).where(eq(shopeeConnections.userId, userId));
      await tx
        .delete(shopeeAuthorizationStates)
        .where(eq(shopeeAuthorizationStates.userId, userId));
    }),
  );
}
