import { afterAll, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { user } from '@/server/db/schema/auth';
import { blingAuthorizationStates, blingConnections } from '@/server/db/schema/bling';
import {
  beginBlingAuthorization,
  finishBlingAuthorization,
  readBlingPreview,
  removeBlingConnection,
} from '@/features/bling/server/connection';
import type { BlingConfiguration } from '@/features/bling/model';

const userId = randomUUID();
const config: BlingConfiguration = {
  BLING_ENABLED: 'true',
  BLING_CLIENT_ID: 'test-client',
  BLING_CLIENT_SECRET: 'test-secret',
  BLING_EXPECTED_CNPJ: '00000000000000',
  BLING_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
};
const previous = Object.fromEntries(Object.keys(config).map((key) => [key, process.env[key]]));
beforeAll(async () => {
  Object.assign(process.env, config);
  await db
    .insert(user)
    .values({ id: userId, name: 'Piloto Bling', email: `${userId}@example.invalid` });
});
afterAll(async () => {
  await db.delete(user).where(eq(user.id, userId));
  for (const key of Object.keys(config)) {
    const value = previous[key];
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
  await db.$client.end();
});

const transport = (handler: (url: URL, init: RequestInit) => Response | Promise<Response>) =>
  ((url: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(new URL(String(url)), init ?? {}))) as typeof fetch;
const tokens = (access = 'test-access') =>
  Response.json({
    access_token: access,
    refresh_token: `${access}-refresh`,
    token_type: 'Bearer',
    expires_in: 3600,
  });

async function state() {
  return new URL(await beginBlingAuthorization(userId, 'test-session', config)).searchParams.get(
    'state',
  )!;
}
const callback = (value: string) => ({
  userId,
  sessionId: 'test-session',
  state: value,
  denied: false,
  code: 'test-code',
});
const accepted = transport((url) =>
  url.pathname.endsWith('/oauth/token')
    ? tokens()
    : Response.json({
        data: { id: 'company-test', nome: 'Empresa de teste', cnpj: config.BLING_EXPECTED_CNPJ },
      }),
);

test('callback confere dona, sessão, validade e consumo único antes de chamar o Bling', async () => {
  const value = await state();
  let calls = 0;
  const never = transport(() => {
    calls++;
    throw new Error('Não deveria chamar API.');
  });
  expect(
    await finishBlingAuthorization({ ...callback(value), userId: 'wrong-user' }, config, never),
  ).toBe('expired');
  expect(
    await finishBlingAuthorization(
      { ...callback(value), sessionId: 'wrong-session' },
      config,
      never,
    ),
  ).toBe('expired');
  expect(calls).toBe(0);
  expect(await finishBlingAuthorization(callback(value), config, accepted)).toBe('connected');
  expect(await finishBlingAuthorization(callback(value), config, never)).toBe('expired');
  const [stored] = await db.select().from(blingConnections).where(eq(blingConnections.id, 'main'));
  expect(stored?.accessTokenEncrypted).not.toContain('test-access');
  expect(stored?.refreshTokenEncrypted).not.toContain('test-access');
  const expired = await state();
  await db
    .update(blingAuthorizationStates)
    .set({ expiresAt: new Date(0) })
    .where(eq(blingAuthorizationStates.userId, userId));
  expect(await finishBlingAuthorization(callback(expired), config, never)).toBe('expired');
}, 15000);

test('empresa errada, recusa e falha não sobrescrevem uma conexão válida', async () => {
  const value = await state();
  const wrong = transport((url) =>
    url.pathname.endsWith('/oauth/token')
      ? tokens('wrong')
      : Response.json({ data: { id: 'other', nome: 'Outra empresa', cnpj: '11111111111111' } }),
  );
  expect(await finishBlingAuthorization(callback(value), config, wrong)).toBe('company');
  expect(
    await finishBlingAuthorization({ ...callback(await state()), denied: true }, config, wrong),
  ).toBe('denied');
  expect(
    await finishBlingAuthorization(
      callback(await state()),
      config,
      transport(() => {
        throw new Error('network');
      }),
    ),
  ).toBe('failed');
  const [connection] = await db
    .select()
    .from(blingConnections)
    .where(eq(blingConnections.id, 'main'));
  expect(connection?.companyId).toBe('company-test');
  expect(connection?.companyCnpj).toBe(config.BLING_EXPECTED_CNPJ);
}, 15000);

test('renovação concorrente faz uma troca e persiste os dois novos tokens', async () => {
  await db
    .update(blingConnections)
    .set({ expiresAt: new Date(0) })
    .where(eq(blingConnections.id, 'main'));
  let renewals = 0;
  const api = transport((url, init) => {
    if (url.pathname.endsWith('/oauth/token')) {
      renewals++;
      expect(new URLSearchParams(String(init.body)).get('refresh_token')).toBe(
        'test-access-refresh',
      );
      return tokens('rotated');
    }
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer rotated');
    return Response.json({ data: [] });
  });
  const previews = await Promise.all([readBlingPreview(api), readBlingPreview(api)]);
  expect(renewals).toBe(1);
  expect(previews).toHaveLength(2);
}, 15000);

test('resultado incerto de renovação exige nova autorização e desconexão remove os tokens', async () => {
  await db
    .update(blingConnections)
    .set({ expiresAt: new Date(0) })
    .where(eq(blingConnections.id, 'main'));
  await expect(
    readBlingPreview(
      transport(() => {
        throw new Error('unknown remote outcome');
      }),
    ),
  ).rejects.toThrow('novamente');
  const [connection] = await db
    .select()
    .from(blingConnections)
    .where(eq(blingConnections.id, 'main'));
  expect(connection?.revokedAt).toBeInstanceOf(Date);
  await removeBlingConnection();
  expect(await db.select().from(blingConnections)).toHaveLength(0);
  expect(await db.select().from(blingAuthorizationStates)).toHaveLength(0);
});
