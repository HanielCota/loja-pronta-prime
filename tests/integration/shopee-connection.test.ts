import { afterAll, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { user, stores, shopeeAuthorizationStates, shopeeConnections } from '@/server/db/schema';
import {
  parseManualShopeeCallback,
  shopeeConfigurationSchema,
} from '@/features/shopee/authorization';
import {
  beginShopeeAuthorization,
  finishShopeeAuthorization,
  readShopeeAccess,
  removeShopeeConnection,
} from '@/features/shopee/server/connection';

const userId = randomUUID();
const otherUser = randomUUID();
const config = shopeeConfigurationSchema.parse({
  SHOPEE_ENABLED: 'true',
  SHOPEE_PARTNER_ID: '123',
  SHOPEE_PARTNER_KEY: 'test-key',
  SHOPEE_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
});
beforeAll(async () => {
  for (const id of [userId, otherUser]) {
    await db.insert(user).values({ id, name: 'Teste Shopee', email: `${id}@example.invalid` });
    await db.insert(stores).values({ userId: id, phase: 4 });
  }
});
afterAll(async () => {
  for (const id of [userId, otherUser]) await db.delete(user).where(eq(user.id, id));
  await db.$client.end();
});
const transport = (handler: (init: RequestInit) => Response | Promise<Response>) =>
  ((_url: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(init ?? {}))) as typeof fetch;
const tokens = (value = 'test-access') =>
  Response.json({
    error: '',
    access_token: value,
    refresh_token: `${value}-refresh`,
    expire_in: 3600,
  });
const accepted = transport(() => tokens());
const state = async (id = userId, settings = config) =>
  new URL(
    await beginShopeeAuthorization(id, 'session', settings, 'https://example.invalid'),
  ).searchParams.get('state')!;
const callback = (value: string, id = userId) => ({
  userId: id,
  sessionId: 'session',
  state: value,
  kind: 'authorize' as const,
  code: 'test-code',
  shopId: 987123456,
});

test('dona, sessão, aplicativo e validade são conferidos antes de usar o código', async () => {
  const value = await state();
  let calls = 0;
  const never = transport(() => {
    calls++;
    throw new Error('Não deveria chamar API.');
  });
  expect(await finishShopeeAuthorization(callback(value, otherUser), config, never)).toBe(
    'expired',
  );
  expect(
    await finishShopeeAuthorization({ ...callback(value), sessionId: 'other' }, config, never),
  ).toBe('expired');
  expect(
    await finishShopeeAuthorization(callback(value), { ...config, SHOPEE_PARTNER_ID: 999 }, never),
  ).toBe('expired');
  await db
    .update(shopeeAuthorizationStates)
    .set({ expiresAt: new Date(0) })
    .where(eq(shopeeAuthorizationStates.userId, userId));
  expect(await finishShopeeAuthorization(callback(value), config, never)).toBe('expired');
  expect(calls).toBe(0);
});

test('consome só a última intenção, cifra tokens e avança apenas após conexão real', async () => {
  const old = await state();
  const value = await state();
  expect(await finishShopeeAuthorization(callback(old), config, accepted)).toBe('expired');
  expect(await finishShopeeAuthorization(callback(value), config, accepted)).toBe('connected');
  expect(await finishShopeeAuthorization(callback(value), config, accepted)).toBe('expired');
  const [stored] = await db
    .select()
    .from(shopeeConnections)
    .where(eq(shopeeConnections.userId, userId));
  expect(stored?.accessTokenEncrypted).not.toContain('test-access');
  expect(stored?.refreshTokenEncrypted).not.toContain('test-access');
  expect(stored?.applicationId).toBe('live:123');
  expect((await db.select().from(stores).where(eq(stores.userId, userId)))[0]?.phase).toBe(5);
  expect(await readShopeeAccess(userId, config, accepted)).toEqual({
    shopId: 987123456,
    accessToken: 'test-access',
  });
});

test('a mesma loja não pode gerar tokens para outra aluna', async () => {
  let calls = 0;
  expect(
    await finishShopeeAuthorization(
      callback(await state(otherUser), otherUser),
      config,
      transport(() => {
        calls++;
        return tokens();
      }),
    ),
  ).toBe('shop-used');
  expect(calls).toBe(0);
});

test('negação e conta principal consomem estado sem chamar API', async () => {
  for (const kind of ['denied', 'main-account'] as const) {
    const value = await state(otherUser);
    expect(
      await finishShopeeAuthorization(
        { userId: otherUser, sessionId: 'session', state: value, kind },
        config,
        accepted,
      ),
    ).toBe(kind);
    expect(await finishShopeeAuthorization(callback(value, otherUser), config, accepted)).toBe(
      'expired',
    );
  }
});

test('renovação concorrente troca uma vez e persiste o novo par', async () => {
  await db
    .update(shopeeConnections)
    .set({ accessTokenExpiresAt: new Date(0) })
    .where(eq(shopeeConnections.userId, userId));
  let calls = 0;
  const api = transport((init) => {
    calls++;
    expect(JSON.parse(String(init.body)).refresh_token).toBe('test-access-refresh');
    return tokens('rotated');
  });
  const values = await Promise.all([
    readShopeeAccess(userId, config, api),
    readShopeeAccess(userId, config, api),
  ]);
  expect(calls).toBe(1);
  expect(values.map((value) => value.accessToken)).toEqual(['rotated', 'rotated']);
});

test('falha no refresh deixa bloqueio durável e não tenta o token antigo de novo', async () => {
  await db
    .update(shopeeConnections)
    .set({ accessTokenExpiresAt: new Date(0) })
    .where(eq(shopeeConnections.userId, userId));
  let calls = 0;
  const api = transport(() => {
    calls++;
    throw new Error('unknown outcome');
  });
  await expect(readShopeeAccess(userId, config, api)).rejects.toThrow();
  await expect(readShopeeAccess(userId, config, api)).rejects.toThrow();
  expect(calls).toBe(1);
  expect(
    (await db.select().from(shopeeConnections).where(eq(shopeeConnections.userId, userId)))[0]
      ?.revokedAt,
  ).toBeInstanceOf(Date);
});

test('sandbox não avança loja real e tokens não podem cruzar ambientes', async () => {
  const sandbox = { ...config, SHOPEE_ENVIRONMENT: 'sandbox' as const };
  const input = { ...callback(await state(otherUser, sandbox), otherUser), shopId: 987123457 };
  expect(await finishShopeeAuthorization(input, sandbox, accepted)).toBe('sandbox');
  expect((await db.select().from(stores).where(eq(stores.userId, otherUser)))[0]?.phase).toBe(4);
  await expect(readShopeeAccess(otherUser, config, accepted)).rejects.toThrow();
});

test('desconexão remove somente os tokens e intenções da própria aluna', async () => {
  await state();
  await removeShopeeConnection(userId);
  expect(
    await db.select().from(shopeeConnections).where(eq(shopeeConnections.userId, userId)),
  ).toHaveLength(0);
  expect(
    await db
      .select()
      .from(shopeeAuthorizationStates)
      .where(eq(shopeeAuthorizationStates.userId, userId)),
  ).toHaveLength(0);
  expect(
    await db.select().from(shopeeConnections).where(eq(shopeeConnections.userId, otherUser)),
  ).toHaveLength(1);
});

test('retorno colado mantém sessão e uso único antes de persistir a conexão', async () => {
  const manual = {
    ...config,
    SHOPEE_CALLBACK_MODE: 'manual' as const,
    SHOPEE_REDIRECT_URI: 'https://legacy.example.invalid/favicon.ico',
  };
  const link = new URL(
    await beginShopeeAuthorization(userId, 'manual-session', manual, 'https://new.example.invalid'),
  );
  const returned = new URL(link.searchParams.get('redirect_uri')!);
  returned.search = new URLSearchParams({
    state: link.searchParams.get('state')!,
    code: 'manual-code',
    shop_id: '987123459',
  }).toString();
  const parsed = parseManualShopeeCallback(returned.toString(), manual)!;
  let calls = 0;
  const api = transport(() => {
    calls++;
    return tokens('manual-access');
  });
  expect(
    await finishShopeeAuthorization({ ...parsed, userId, sessionId: 'wrong-session' }, manual, api),
  ).toBe('expired');
  expect(calls).toBe(0);
  expect(
    await finishShopeeAuthorization(
      { ...parsed, userId, sessionId: 'manual-session' },
      manual,
      api,
    ),
  ).toBe('connected');
  expect(
    await finishShopeeAuthorization(
      { ...parsed, userId, sessionId: 'manual-session' },
      manual,
      api,
    ),
  ).toBe('expired');
  expect(calls).toBe(1);
  expect(await readShopeeAccess(userId, manual, api)).toEqual({
    shopId: 987123459,
    accessToken: 'manual-access',
  });
  await removeShopeeConnection(userId);
});
