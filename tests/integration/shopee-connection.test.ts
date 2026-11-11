import { afterAll, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  user,
  stores,
  studentProducts,
  manualProductGrants,
  shopeeAuthorizationStates,
  shopeeConnections,
} from '@/server/db/schema';
import {
  parseManualShopeeCallback,
  shopeeConfigurationSchema,
} from '@/features/shopee/authorization';
import {
  beginShopeeAuthorization,
  finishShopeeAuthorization,
  getShopeeAuthorizationOrigin,
  getShopeeStatus,
  guardShopeeWrites,
  hasShopeeConnection,
  readShopeeAccess,
  removeShopeeConnection,
} from '@/features/shopee/server/connection';
import { rejection } from '../support/rejection';

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
    await db.insert(studentProducts).values({ userId: id, product: 'loja-pronta' });
    await db.insert(manualProductGrants).values({ userId: id, product: 'loja-pronta' });
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

test('SLL conecta sem Loja Pronta e não avança uma montagem existente', async () => {
  const id = randomUUID();
  await db.insert(user).values({ id, name: 'Somente SLL', email: `${id}@example.invalid` });
  try {
    await db.insert(studentProducts).values({ userId: id, product: 'sll' });
    await db.insert(manualProductGrants).values({ userId: id, product: 'sll' });
    const authorize = async () => {
      const url = new URL(
        await beginShopeeAuthorization(id, 'session', config, 'https://example.invalid', 'sll'),
      );
      return { ...callback(url.searchParams.get('state')!, id), shopId: 987123459 };
    };
    expect(await finishShopeeAuthorization(await authorize(), config, accepted)).toBe('connected');
    expect(await db.select().from(stores).where(eq(stores.userId, id))).toHaveLength(0);
    await db.insert(stores).values({ userId: id, phase: 4 });
    await db.insert(studentProducts).values({ userId: id, product: 'loja-pronta' });
    await db.insert(manualProductGrants).values({ userId: id, product: 'loja-pronta' });
    expect(await finishShopeeAuthorization(await authorize(), config, accepted)).toBe('connected');
    expect((await db.select().from(stores).where(eq(stores.userId, id)))[0]?.phase).toBe(4);
    const pending = await authorize();
    await db.delete(studentProducts).where(eq(studentProducts.userId, id));
    let calls = 0;
    expect(
      await finishShopeeAuthorization(
        pending,
        config,
        transport(() => {
          calls++;
          return tokens();
        }),
      ),
    ).toBe('expired');
    expect(calls).toBe(0);
  } finally {
    await db.delete(user).where(eq(user.id, id));
  }
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
    authorizationId: stored!.authorizationId,
  });
});

test('a superseded SLL attempt retains its return origin and cannot exchange its code', async () => {
  const old = new URL(
    await beginShopeeAuthorization(otherUser, 'session', config, 'https://example.invalid', 'sll'),
  ).searchParams.get('state')!;
  await state(otherUser);
  expect(await getShopeeAuthorizationOrigin(otherUser, 'session', old)).toBe('sll');
  expect(await getShopeeAuthorizationOrigin(otherUser, 'wrong-session', old)).toBeNull();
  const fetcher = transport(() => {
    throw new Error('A superseded attempt cannot exchange its code.');
  });
  expect(await finishShopeeAuthorization(callback(old, otherUser), config, fetcher)).toBe(
    'expired',
  );
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

test('leitura da conexão não renova o token e só vale para o mesmo aplicativo', async () => {
  await db
    .update(shopeeConnections)
    .set({ accessTokenExpiresAt: new Date(0) })
    .where(eq(shopeeConnections.userId, userId));
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = transport(() => {
    calls++;
    return new Response(null, { status: 429 });
  });
  try {
    expect(await getShopeeStatus(userId, config)).toEqual({
      connected: true,
      saved: true,
      shopId: 987123456,
    });
    expect(calls).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
  }
  const [stored] = await db
    .select()
    .from(shopeeConnections)
    .where(eq(shopeeConnections.userId, userId));
  expect(stored?.accessTokenExpiresAt.getTime()).toBe(0);
  expect(stored?.revokedAt).toBeNull();
  expect(await hasShopeeConnection(userId, { ...config, SHOPEE_ENVIRONMENT: 'sandbox' })).toBe(
    false,
  );
  expect(await hasShopeeConnection(randomUUID(), config)).toBe(false);
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
  await rejection(readShopeeAccess(userId, config, api));
  await rejection(readShopeeAccess(userId, config, api));
  expect(calls).toBe(1);
  expect(
    (await db.select().from(shopeeConnections).where(eq(shopeeConnections.userId, userId)))[0]
      ?.revokedAt,
  ).toBeInstanceOf(Date);
  expect(await hasShopeeConnection(userId, config)).toBe(false);
  expect(await getShopeeStatus(userId, config)).toEqual({ connected: false, saved: true });
});

test('sandbox não avança loja real e tokens não podem cruzar ambientes', async () => {
  const sandbox = { ...config, SHOPEE_ENVIRONMENT: 'sandbox' as const };
  const input = { ...callback(await state(otherUser, sandbox), otherUser), shopId: 987123457 };
  expect(await finishShopeeAuthorization(input, sandbox, accepted)).toBe('sandbox');
  expect((await db.select().from(stores).where(eq(stores.userId, otherUser)))[0]?.phase).toBe(4);
  await rejection(readShopeeAccess(otherUser, config, accepted));
});

test('sandbox authorization and disconnect preserve the production link and pending state', async () => {
  const sandbox = { ...config, SHOPEE_ENVIRONMENT: 'sandbox' as const };
  const liveState = await state(otherUser);
  const live = { ...callback(liveState, otherUser), shopId: 987123457 };
  expect(await finishShopeeAuthorization(live, config, accepted)).toBe('connected');
  const liveAccess = await readShopeeAccess(otherUser, config, accepted);
  const pendingLive = await state(otherUser);
  const testShop = { ...callback(await state(otherUser, sandbox), otherUser), shopId: 987123457 };
  expect(
    await finishShopeeAuthorization(
      testShop,
      sandbox,
      transport(() => tokens('sandbox')),
    ),
  ).toBe('sandbox');
  expect(await readShopeeAccess(otherUser, config, accepted)).toEqual(liveAccess);
  expect((await readShopeeAccess(otherUser, sandbox, accepted)).accessToken).toBe('sandbox');
  await removeShopeeConnection(otherUser, sandbox);
  expect(await getShopeeStatus(otherUser, sandbox)).toEqual({ connected: false, saved: false });
  expect(await readShopeeAccess(otherUser, config, accepted)).toEqual(liveAccess);
  expect(await finishShopeeAuthorization(callback(pendingLive, otherUser), config, accepted)).toBe(
    'shop-used',
  );
});

test('an in-flight write finishes before disconnect and stale authorization cannot write again', async () => {
  const access = await readShopeeAccess(otherUser, config, accepted);
  const started = Promise.withResolvers<void>();
  const response = Promise.withResolvers<Response>();
  let calls = 0;
  const fetcher = guardShopeeWrites(
    otherUser,
    config,
    access,
    transport(() => {
      calls++;
      started.resolve();
      return response.promise;
    }),
  );
  const send = () =>
    fetcher('https://partner.shopeemobile.com/api/v2/product/update_item', { method: 'POST' });
  const first = send();
  await started.promise;
  const removing = removeShopeeConnection(otherUser, config);
  try {
    expect(await hasShopeeConnection(otherUser, config)).toBe(true);
  } finally {
    response.resolve(Response.json({ error: '' }));
    await Promise.all([first, removing]);
  }
  await rejection(send());
  const next = { ...callback(await state(otherUser), otherUser), shopId: access.shopId };
  expect(await finishShopeeAuthorization(next, config, accepted)).toBe('connected');
  await rejection(send());
  expect(calls).toBe(1);
});

test('disconnect invalidates the current app authorization and keeps the return origin', async () => {
  const pending = await state();
  await removeShopeeConnection(userId, config);
  expect(await getShopeeAuthorizationOrigin(userId, 'session', pending)).toBe('loja-pronta');
  expect(await finishShopeeAuthorization(callback(pending), config, accepted)).toBe('expired');
  expect(
    await db.select().from(shopeeConnections).where(eq(shopeeConnections.userId, userId)),
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
  expect(await readShopeeAccess(userId, manual, api)).toMatchObject({
    shopId: 987123459,
    accessToken: 'manual-access',
  });
  await removeShopeeConnection(userId, manual);
});

test('recovered products can connect before setup without advancing the setup phase', async () => {
  const id = randomUUID();
  await db
    .insert(user)
    .values({ id, name: 'Recovered catalog test', email: `${id}@example.invalid` });
  try {
    await db.insert(stores).values({ userId: id, phase: 1 });
    await db.insert(studentProducts).values({ userId: id, product: 'loja-pronta' });
    await db.insert(manualProductGrants).values({ userId: id, product: 'loja-pronta' });
    const url = new URL(
      await beginShopeeAuthorization(id, 'session', config, 'https://example.invalid', 'recovered'),
    );
    expect(
      await finishShopeeAuthorization(
        { ...callback(url.searchParams.get('state')!, id), shopId: 987123460 },
        config,
        accepted,
      ),
    ).toBe('connected');
    expect((await db.select().from(stores).where(eq(stores.userId, id)))[0]?.phase).toBe(1);
    const next = new URL(
      await beginShopeeAuthorization(id, 'session', config, 'https://example.invalid', 'recovered'),
    );
    await db.delete(studentProducts).where(eq(studentProducts.userId, id));
    let calls = 0;
    expect(
      await finishShopeeAuthorization(
        { ...callback(next.searchParams.get('state')!, id), shopId: 987123460 },
        config,
        transport(() => {
          calls++;
          return tokens();
        }),
      ),
    ).toBe('expired');
    expect(calls).toBe(0);
  } finally {
    await db.delete(user).where(eq(user.id, id));
  }
});
