import { afterAll, describe, expect, mock, test } from 'bun:test';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';

/**
 * Teste de estresse do "Entrar como aluna", com o banco e o plugin de verdade. Fica desligado na
 * suíte normal (demora e enche o banco de propósito): rode com
 * `VISIT_STRESS=1 bun run test:integration -t estresse`.
 *
 * Cada "navegador" simulado tem o próprio pote de cookies (AsyncLocalStorage), então várias
 * pessoas da equipe agem ao mesmo tempo sem misturar sessões.
 */

const enabled = Boolean(process.env.VISIT_STRESS);
const origin = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
const browser = new AsyncLocalStorage<Map<string, string>>();

function jar(): Map<string, string> {
  const store = browser.getStore();
  if (!store) throw new Error('chamada fora de um navegador simulado');
  return store;
}

const nextHeaders = () => ({
  headers: async () =>
    new Headers({
      cookie: [...jar()].map(([name, value]) => `${name}=${value}`).join('; '),
      origin,
      host: new URL(origin).host,
    }),
  cookies: async () => ({
    get: (name: string) => (jar().has(name) ? { name, value: jar().get(name)! } : undefined),
    getAll: () => [...jar()].map(([name, value]) => ({ name, value })),
    has: (name: string) => jar().has(name),
    set: (name: string, value: string, options?: { maxAge?: number; expires?: Date }) => {
      const expired =
        options?.maxAge === 0 || (options?.expires && options.expires.getTime() < Date.now());
      if (expired || value === '') {
        jar().delete(name);
        return;
      }
      jar().set(name, value);
    },
    delete: (name: string) => jar().delete(name),
  }),
});
mock.module('next/headers', nextHeaders);
mock.module('next/headers.js', nextHeaders);
mock.module('next/navigation', () => ({
  redirect: (path: string) => {
    throw Object.assign(new Error(`redirect:${path}`), {
      digest: `NEXT_REDIRECT;replace;${path};307;`,
    });
  },
  notFound: () => {
    throw Object.assign(new Error('not found'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' });
  },
  unstable_rethrow: (error: unknown) => {
    if (typeof error === 'object' && error !== null && 'digest' in error) throw error;
  },
}));
mock.module('next/cache', () => ({
  refresh: () => {},
  revalidatePath: () => {},
  revalidateTag: () => {},
  updateTag: () => {},
  unstable_cache: (read: (...args: unknown[]) => unknown) => read,
}));

const { auth } = await import('@/server/auth/auth');
const { db } = await import('@/server/db');
const { account, session, supportImpersonationLog, user, userPresence } =
  await import('@/server/db/schema');
const { getSessionState, getVisit } = await import('@/features/auth/server/session');
const { runAsStudent } = await import('@/features/support/server/impersonation');
const { leaveVisit, startVisit } = await import('@/features/support-desk/server/visit-actions');
const { POST: presence } = await import('@/app/api/presence/route');
const { ADMIN_PLUGIN_PATHS } = await import('@/features/auth/auth-roles');

const password = 'senha de estresse da equipe';
const users: string[] = [];
const timings: string[] = [];

async function createAccounts(role: string, count: number): Promise<string[]> {
  const context = await auth.$context;
  const hash = await context.password.hash(password);
  const ids = Array.from({ length: count }, () => randomUUID());
  users.push(...ids);
  await db.insert(user).values(
    ids.map((id) => ({
      id,
      name: `Estresse ${role}`,
      email: `${id}@example.invalid`,
      emailVerified: true,
      role,
      mustChangePassword: false,
    })),
  );
  await db
    .insert(account)
    .values(
      ids.map((id) => ({
        id,
        accountId: id,
        providerId: 'credential',
        userId: id,
        password: hash,
      })),
    );
  return ids;
}

/** Um navegador novo, já logado. */
async function signedInBrowser(id: string): Promise<Map<string, string>> {
  const cookies = new Map<string, string>();
  const { headers } = await auth.api.signInEmail({
    body: { email: `${id}@example.invalid`, password },
    returnHeaders: true,
  });
  for (const cookie of headers.getSetCookie()) {
    const [pair] = cookie.split(';');
    const separator = pair!.indexOf('=');
    cookies.set(pair!.slice(0, separator), decodeURIComponent(pair!.slice(separator + 1)));
  }
  return cookies;
}

function inBrowser<Result>(cookies: Map<string, string>, run: () => Promise<Result>) {
  return browser.run(cookies, run);
}

function visitForm(studentId: string) {
  const form = new FormData();
  form.set('aluna', studentId);
  form.set('voltar', '/admin/chamados');
  return form;
}

/** Roda e devolve o destino do redirect, ou `null` se não redirecionou. */
async function redirected(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('redirect:'))
      return error.message.slice(9);
    throw error;
  }
}

async function timed<Result>(label: string, run: () => Promise<Result>): Promise<Result> {
  const start = performance.now();
  const result = await run();
  timings.push(`${label}: ${Math.round(performance.now() - start)} ms`);
  return result;
}

async function logsOf(sessionIds: string[]) {
  if (sessionIds.length === 0) return [];
  return db
    .select()
    .from(supportImpersonationLog)
    .where(inArray(supportImpersonationLog.sessionId, sessionIds));
}

async function openVisitSessions(studentIds: string[]) {
  return db
    .select({ id: session.id })
    .from(session)
    .where(and(inArray(session.userId, studentIds), isNotNull(session.impersonatedBy)));
}

afterAll(async () => {
  if (users.length) {
    await db.delete(supportImpersonationLog).where(inArray(supportImpersonationLog.staffId, users));
    await db.delete(user).where(inArray(user.id, users));
  }
  if (timings.length) console.log(`\n[estresse] tempos\n  ${timings.join('\n  ')}`);
  await db.$client.end();
});

describe.skipIf(!enabled)('estresse do "Entrar como aluna"', () => {
  test('20 admins em 20 alunas ao mesmo tempo, cada um com ações misturadas', async () => {
    const admins = await createAccounts('admin', 20);
    const students = await createAccounts('user', 20);
    const browsers = await Promise.all(admins.map(signedInBrowser));

    const sessionIds = await timed('20 visitas paralelas com 16 ações cada', () =>
      Promise.all(
        admins.map((adminId, index) =>
          inBrowser(browsers[index]!, async () => {
            const started = await startVisit(visitForm(students[index]!));
            expect(started.ok).toBe(true);
            const visit = await getVisit();
            expect(visit?.staffId).toBe(adminId);
            expect(visit?.studentId).toBe(students[index]);

            const allowed = Array.from({ length: 10 }, (_, n) =>
              runAsStudent(`saveBrandName`, async () => n),
            );
            const blocked = Array.from({ length: 3 }, () =>
              redirected(() => runAsStudent('changePassword', async () => 'não devia rodar')),
            );
            const quiet = Array.from({ length: 3 }, () =>
              runAsStudent('markMyTicketRead', async () => 'não devia rodar', 'pulado'),
            );
            const [done, refused, skipped] = await Promise.all([
              Promise.all(allowed),
              Promise.all(blocked),
              Promise.all(quiet),
            ]);
            expect(done.toSorted((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
            expect(refused).toEqual(Array(3).fill('/visita-bloqueada?acao=changePassword'));
            expect(skipped).toEqual(Array(3).fill('pulado'));

            expect(await leaveVisit()).toEqual({ ok: true });
            const back = await getSessionState();
            expect(back.status === 'active' ? back.session.user.id : null).toBe(adminId);
            return visit!.sessionId;
          }),
        ),
      ),
    );

    const log = await logsOf(sessionIds);
    expect(log).toHaveLength(20 * (1 + 10 + 3 + 1));
    for (const [index, sessionId] of sessionIds.entries()) {
      const rows = log.filter((row) => row.sessionId === sessionId);
      const count = (kind: string) => rows.filter((row) => row.kind === kind).length;
      expect([count('started'), count('action'), count('refused'), count('ended')]).toEqual([
        1, 10, 3, 1,
      ]);
      // Nenhum registro trocado de pessoa entre as visitas paralelas.
      expect(new Set(rows.map((row) => row.staffId))).toEqual(new Set([admins[index]!]));
      expect(new Set(rows.map((row) => row.studentId))).toEqual(new Set([students[index]!]));
    }
    expect(await openVisitSessions(students)).toEqual([]);
  }, 120_000);

  test('10 admins na mesma aluna ao mesmo tempo: cada um com o próprio registro', async () => {
    const admins = await createAccounts('admin', 10);
    const [studentId] = await createAccounts('user', 1);
    const browsers = await Promise.all(admins.map(signedInBrowser));

    const sessionIds = await timed('10 visitas na mesma aluna', () =>
      Promise.all(
        admins.map((_, index) =>
          inBrowser(browsers[index]!, async () => {
            expect((await startVisit(visitForm(studentId!))).ok).toBe(true);
            const visit = await getVisit();
            await Promise.all(
              Array.from({ length: 5 }, () => runAsStudent('chooseExpert', async () => null)),
            );
            expect(await leaveVisit()).toEqual({ ok: true });
            return visit!.sessionId;
          }),
        ),
      ),
    );

    expect(new Set(sessionIds).size).toBe(10);
    const log = await logsOf(sessionIds);
    for (const [index, sessionId] of sessionIds.entries()) {
      const rows = log.filter((row) => row.sessionId === sessionId);
      expect(rows).toHaveLength(7);
      expect(rows.every((row) => row.staffId === admins[index])).toBe(true);
    }
    expect(await openVisitSessions([studentId!])).toEqual([]);
  }, 120_000);

  test('500 ações simultâneas numa visita: cada uma registrada uma vez', async () => {
    const [adminId] = await createAccounts('admin', 1);
    const [studentId] = await createAccounts('user', 1);
    const cookies = await signedInBrowser(adminId!);

    await inBrowser(cookies, async () => {
      await startVisit(visitForm(studentId!));
      const visit = await getVisit();
      const results = await timed('500 ações permitidas em paralelo', () =>
        Promise.all(
          Array.from({ length: 500 }, (_, n) => runAsStudent('saveAnswer', async () => n)),
        ),
      );
      expect(results).toHaveLength(500);
      await leaveVisit();
      const rows = await logsOf([visit!.sessionId]);
      expect(rows.filter((row) => row.kind === 'action')).toHaveLength(500);
    });
  }, 120_000);

  test('50 entradas e saídas seguidas: nada sobra aberto e a sessão da equipe continua a mesma', async () => {
    const [adminId] = await createAccounts('admin', 1);
    const [studentId] = await createAccounts('user', 1);
    const cookies = await signedInBrowser(adminId!);
    const ownSessionBefore = await inBrowser(cookies, async () => {
      const state = await getSessionState();
      return state.status === 'active' ? state.session.session.id : null;
    });

    await timed('50 ciclos de entrar e sair', () =>
      inBrowser(cookies, async () => {
        for (let cycle = 0; cycle < 50; cycle += 1) {
          expect((await startVisit(visitForm(studentId!))).ok).toBe(true);
          expect(await leaveVisit()).toEqual({ ok: true });
        }
      }),
    );

    const after = await inBrowser(cookies, getSessionState);
    expect(after.status === 'active' ? after.session.session.id : null).toBe(ownSessionBefore);
    expect(await openVisitSessions([studentId!])).toEqual([]);
    const rows = await db
      .select({ kind: supportImpersonationLog.kind })
      .from(supportImpersonationLog)
      .where(eq(supportImpersonationLog.studentId, studentId!));
    expect(rows.filter((row) => row.kind === 'started')).toHaveLength(50);
    expect(rows.filter((row) => row.kind === 'ended')).toHaveLength(50);
    // Uma sessão só do admin no banco: entrar e sair não cria sessões novas dele.
    const adminSessions = await db.select().from(session).where(eq(session.userId, adminId!));
    expect(adminSessions).toHaveLength(1);
  }, 120_000);

  test('clique duplo em "Entrar" e em "Voltar ao painel"', async () => {
    const [adminId] = await createAccounts('admin', 1);
    const [studentId] = await createAccounts('user', 1);
    const cookies = await signedInBrowser(adminId!);

    // Como no navegador: os dois cliques saem com os mesmos cookies, e fica o da última resposta.
    async function doubleClick<Result>(action: () => Promise<Result>): Promise<Result[]> {
      const finished: Map<string, string>[] = [];
      const results = await Promise.all(
        [new Map(cookies), new Map(cookies)].map((click) =>
          inBrowser(click, async () => {
            const result = await action();
            finished.push(click);
            return result;
          }),
        ),
      );
      const last = finished.at(-1)!;
      cookies.clear();
      for (const [name, value] of last) cookies.set(name, value);
      return results;
    }

    const starts = await doubleClick(() => startVisit(visitForm(studentId!)));
    timings.push(`clique duplo em Entrar: ${JSON.stringify(starts.map((item) => item.ok))}`);
    expect(starts.every((item) => item.ok)).toBe(true);
    // Só a visita da última resposta continua aberta; a outra foi encerrada e registrada.
    expect(await openVisitSessions([studentId!])).toHaveLength(1);
    const visit = await inBrowser(cookies, getVisit);
    expect(visit?.studentId).toBe(studentId);

    const leaves = await doubleClick(leaveVisit);
    timings.push(`clique duplo em Voltar: ${JSON.stringify(leaves.map((item) => item.ok))}`);
    expect(leaves.some((item) => item.ok)).toBe(true);
    const state = await inBrowser(cookies, getSessionState);
    expect(state.status === 'active' ? state.session.user.id : null).toBe(adminId!);
    expect(await openVisitSessions([studentId!])).toEqual([]);

    const rows = await db
      .select({ kind: supportImpersonationLog.kind, action: supportImpersonationLog.action })
      .from(supportImpersonationLog)
      .where(eq(supportImpersonationLog.studentId, studentId!));
    expect(rows.filter((row) => row.kind === 'started')).toHaveLength(2);
    expect(
      rows
        .filter((row) => row.kind === 'ended')
        .map((row) => row.action)
        .toSorted(),
    ).toEqual(['nova visita', 'voltar ao painel']);
  }, 60_000);

  test('a presença martelada 200 vezes durante a visita não grava nada', async () => {
    const [adminId] = await createAccounts('admin', 1);
    const [studentId] = await createAccounts('user', 1);
    const cookies = await signedInBrowser(adminId!);

    await inBrowser(cookies, async () => {
      await startVisit(visitForm(studentId!));
      const statuses = await timed('200 avisos de presença', () =>
        Promise.all(
          Array.from({ length: 200 }, async () => {
            const response = await presence(
              new Request(`${origin}/api/presence`, {
                method: 'POST',
                headers: { origin, 'content-type': 'application/json' },
                body: JSON.stringify({ path: '/sll' }),
              }),
            );
            return response.status;
          }),
        ),
      );
      expect(new Set(statuses)).toEqual(new Set([204]));
      await leaveVisit();
    });
    expect(await db.select().from(userPresence).where(eq(userPresence.userId, studentId!))).toEqual(
      [],
    );
  }, 60_000);

  test('fronteira de 1 hora: 59 min ainda vale, 60 min já acabou', async () => {
    const admins = await createAccounts('admin', 10);
    const students = await createAccounts('user', 10);
    const browsers = await Promise.all(admins.map(signedInBrowser));

    await Promise.all(
      admins.map((_, index) =>
        inBrowser(browsers[index]!, async () => {
          await startVisit(visitForm(students[index]!));
          const visit = await getVisit();
          const minutes = index % 2 === 0 ? 59 : 60;
          await db
            .update(session)
            .set({ createdAt: new Date(Date.now() - minutes * 60 * 1000) })
            .where(eq(session.id, visit!.sessionId));
          const outcome = await redirected(() => runAsStudent('saveAnswer', async () => 'ok'));
          expect(outcome).toBe(minutes === 59 ? null : '/visita-encerrada');
          expect(await leaveVisit()).toEqual({ ok: true });
        }),
      ),
    );
    expect(await openVisitSessions(students)).toEqual([]);
  }, 60_000);

  test('50 tentativas paralelas em conta da equipe: nenhuma sessão aberta', async () => {
    const [adminId] = await createAccounts('admin', 1);
    const [agentId] = await createAccounts('user,support_agent', 1);
    const cookies = await signedInBrowser(adminId!);

    const results = await inBrowser(cookies, () =>
      Promise.all(Array.from({ length: 50 }, () => startVisit(visitForm(agentId!)))),
    );
    expect(new Set(results.map((item) => (item.ok ? 'entrou' : item.message)))).toEqual(
      new Set(['Contas da equipe não podem ser acessadas.']),
    );
    expect(await openVisitSessions([agentId!])).toEqual([]);
  }, 60_000);

  test('300 chamadas HTTP nas rotas do plugin admin: todas 404', async () => {
    const [adminId] = await createAccounts('admin', 1);
    const cookies = await signedInBrowser(adminId!);
    const cookieHeader = [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');

    const statuses = await timed('300 chamadas HTTP às rotas do plugin', () =>
      Promise.all(
        Array.from({ length: 20 }).flatMap(() =>
          ADMIN_PLUGIN_PATHS.map(async (path) => {
            const response = await auth.handler(
              new Request(`${origin}/api/auth${path}`, {
                method: 'POST',
                headers: { origin, cookie: cookieHeader, 'content-type': 'application/json' },
                body: JSON.stringify({ userId: adminId }),
              }),
            );
            return response.status;
          }),
        ),
      ),
    );
    expect(statuses).toHaveLength(300);
    expect(new Set(statuses)).toEqual(new Set([404]));
  }, 60_000);
});
