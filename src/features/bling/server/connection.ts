import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { blingAuthorizationStates, blingConnections } from '@/server/db/schema/bling';
import { decryptShopeeToken, encryptShopeeToken } from '@/lib/shopee-protocol';
import {
  blingChannelsSchema,
  blingCompanySchema,
  blingProductsSchema,
  buildBlingAuthorizationUrl,
  type BlingConfiguration,
} from '../model';
import { BlingError, getBlingConfiguration, readBlingResource, requestBlingTokens } from './client';

const stateHash = (state: string) => createHash('sha256').update(state).digest('hex');
const owner = (userId: string, clientId: string, companyId: string) =>
  `bling:main:${userId}:${clientId}:${companyId}`;

/** A mesma trava cobre autorização, renovação e desconexão, inclusive entre processos. */
async function locked<T>(
  work: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('bling:main'))`);
    return work(tx);
  });
}

export async function beginBlingAuthorization(
  userId: string,
  sessionId: string,
  config: BlingConfiguration,
) {
  const state = randomBytes(32).toString('hex');
  await locked(async (tx) => {
    await tx.delete(blingAuthorizationStates).where(eq(blingAuthorizationStates.userId, userId));
    await tx.insert(blingAuthorizationStates).values({
      stateHash: stateHash(state),
      userId,
      sessionId,
      clientId: config.BLING_CLIENT_ID,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
  });
  return buildBlingAuthorizationUrl(config.BLING_CLIENT_ID, state);
}

/** O callback só é chamado depois da guarda de admin e consome a intenção antes de usar o código. */
export async function finishBlingAuthorization(
  input: { userId: string; sessionId: string; state: string; denied: boolean; code?: string },
  config: BlingConfiguration,
  fetcher: typeof fetch = fetch,
) {
  return locked(async (tx) => {
    const [intent] = await tx
      .update(blingAuthorizationStates)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(blingAuthorizationStates.stateHash, stateHash(input.state)),
          eq(blingAuthorizationStates.userId, input.userId),
          eq(blingAuthorizationStates.sessionId, input.sessionId),
          eq(blingAuthorizationStates.clientId, config.BLING_CLIENT_ID),
          isNull(blingAuthorizationStates.consumedAt),
          gt(blingAuthorizationStates.expiresAt, new Date()),
        ),
      )
      .returning({ userId: blingAuthorizationStates.userId });
    if (!intent) return 'expired';
    if (input.denied) return 'denied';
    if (!input.code) return 'failed';
    try {
      const tokens = await requestBlingTokens(config, { code: input.code }, fetcher);
      const parsed = blingCompanySchema.safeParse(
        await readBlingResource(tokens.accessToken, 'company', fetcher),
      );
      if (!parsed.success) return 'failed';
      const company = parsed.data.data;
      if (company.cnpj !== config.BLING_EXPECTED_CNPJ) return 'company';
      const tokenOwner = owner(input.userId, config.BLING_CLIENT_ID, company.id);
      const values = {
        userId: input.userId,
        clientId: config.BLING_CLIENT_ID,
        companyId: company.id,
        companyCnpj: company.cnpj,
        companyName: company.nome,
        accessTokenEncrypted: encryptShopeeToken(
          tokens.accessToken,
          config.BLING_TOKEN_ENCRYPTION_KEY,
          tokenOwner,
        ),
        refreshTokenEncrypted: encryptShopeeToken(
          tokens.refreshToken,
          config.BLING_TOKEN_ENCRYPTION_KEY,
          tokenOwner,
        ),
        expiresAt: tokens.expiresAt,
        revokedAt: null,
        updatedAt: new Date(),
      };
      await tx
        .insert(blingConnections)
        .values({ id: 'main', ...values })
        .onConflictDoUpdate({ target: blingConnections.id, set: values });
      return 'connected';
    } catch {
      // Consumo confirmado mesmo na falha: um código de uso único não pode ser repetido.
      return 'failed';
    }
  });
}

export async function getBlingStatus() {
  const config = getBlingConfiguration();
  if (!config) return { status: 'unconfigured' as const };
  const [connection] = await db
    .select({
      companyName: blingConnections.companyName,
      revokedAt: blingConnections.revokedAt,
      clientId: blingConnections.clientId,
      companyCnpj: blingConnections.companyCnpj,
    })
    .from(blingConnections)
    .where(eq(blingConnections.id, 'main'));
  if (
    !connection ||
    connection.revokedAt ||
    connection.clientId !== config.BLING_CLIENT_ID ||
    connection.companyCnpj !== config.BLING_EXPECTED_CNPJ
  )
    return { status: 'disconnected' as const };
  return { status: 'connected' as const, companyName: connection.companyName };
}

export async function readBlingPreview(fetcher: typeof fetch = fetch) {
  const config = getBlingConfiguration();
  if (!config) throw new BlingError('unavailable');
  const result = await locked(async (tx) => {
    const [connection] = await tx
      .select()
      .from(blingConnections)
      .where(eq(blingConnections.id, 'main'));
    if (
      !connection ||
      connection.revokedAt ||
      connection.clientId !== config.BLING_CLIENT_ID ||
      connection.companyCnpj !== config.BLING_EXPECTED_CNPJ
    )
      return { error: new BlingError('authorization') };
    const tokenOwner = owner(connection.userId, connection.clientId, connection.companyId);
    let token: string;
    try {
      token = decryptShopeeToken(
        connection.accessTokenEncrypted,
        config.BLING_TOKEN_ENCRYPTION_KEY,
        tokenOwner,
      );
    } catch {
      return { error: new BlingError('authorization') };
    }
    if (connection.expiresAt.getTime() <= Date.now() + 60000) {
      try {
        const tokens = await requestBlingTokens(
          config,
          {
            refreshToken: decryptShopeeToken(
              connection.refreshTokenEncrypted,
              config.BLING_TOKEN_ENCRYPTION_KEY,
              tokenOwner,
            ),
          },
          fetcher,
        );
        token = tokens.accessToken;
        await tx
          .update(blingConnections)
          .set({
            accessTokenEncrypted: encryptShopeeToken(
              tokens.accessToken,
              config.BLING_TOKEN_ENCRYPTION_KEY,
              tokenOwner,
            ),
            refreshTokenEncrypted: encryptShopeeToken(
              tokens.refreshToken,
              config.BLING_TOKEN_ENCRYPTION_KEY,
              tokenOwner,
            ),
            expiresAt: tokens.expiresAt,
          })
          .where(eq(blingConnections.id, 'main'));
      } catch {
        // Na dúvida sobre uma renovação remota, pede uma autorização nova em vez de usar token antigo.
        await tx
          .update(blingConnections)
          .set({ revokedAt: new Date() })
          .where(eq(blingConnections.id, 'main'));
        return { error: new BlingError('authorization') };
      }
    }
    try {
      // Sequencial para respeitar o limite de chamadas da conta Bling.
      const channels = blingChannelsSchema.safeParse(
        await readBlingResource(token, 'channels', fetcher),
      );
      const products = blingProductsSchema.safeParse(
        await readBlingResource(token, 'products', fetcher),
      );
      if (!channels.success || !products.success) return { error: new BlingError('response') };
      return {
        channels: channels.data.data.filter(
          (channel) => channel.tipo === 'Shopee' && channel.situacao === 1,
        ),
        products: products.data.data,
      };
    } catch (error) {
      if (error instanceof BlingError && error.reason === 'authorization')
        await tx
          .update(blingConnections)
          .set({ revokedAt: new Date() })
          .where(eq(blingConnections.id, 'main'));
      return { error: error instanceof BlingError ? error : new BlingError('response') };
    }
  });
  if ('error' in result) throw result.error;
  return result;
}

/** Remove o acesso local. O aplicativo também pode ser revogado na Central de Extensões do Bling. */
export async function removeBlingConnection() {
  await locked(async (tx) => {
    await tx.delete(blingConnections).where(eq(blingConnections.id, 'main'));
    await tx.delete(blingAuthorizationStates);
  });
}
