import { afterAll, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';

/**
 * "Entrar como aluna" de ponta a ponta, com o banco de verdade e o plugin admin do Better Auth:
 * os cookies passam por um pote em memória no lugar do `next/headers`, do jeito que o
 * `nextCookies` grava numa Server Action.
 */

const origin = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
const jar = new Map<string, string>();

const cookieStore = {
  get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
  getAll: () => [...jar].map(([name, value]) => ({ name, value })),
  has: (name: string) => jar.has(name),
  set: (name: string, value: string, options?: { maxAge?: number; expires?: Date }) => {
    const expired =
      options?.maxAge === 0 || (options?.expires && options.expires.getTime() < Date.now());
    if (expired || value === '') {
      jar.delete(name);
      return;
    }
    jar.set(name, value);
  },
  delete: (name: string) => jar.delete(name),
};

/** Quando preenchido, `headers()` devolve sempre o mesmo objeto, como numa requisição só do Next. */
let sameRequest: Headers | null = null;

const nextHeaders = () => ({
  headers: async () =>
    sameRequest ??
    new Headers({
      cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; '),
      origin,
      host: new URL(origin).host,
    }),
  cookies: async () => cookieStore,
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
const { getActiveSession, getSessionState, getVisit } =
  await import('@/features/auth/server/session');
const { runAsStudent } = await import('@/features/support/server/impersonation');
const { leaveVisit, startVisit } = await import('@/features/support-desk/server/visit-actions');
const { updateName } = await import('@/features/auth/server/profile');
const { markMyTicketRead } = await import('@/features/support/server/actions');
const { POST: presence } = await import('@/app/api/presence/route');
const { POST: lessonView } = await import('@/app/api/sll/progress/view/route');

const password = 'senha da equipe de teste';
const users: string[] = [];

async function createAccount(role: string, mustChangePassword = false) {
  const id = randomUUID();
  users.push(id);
  const context = await auth.$context;
  await db.insert(user).values({
    id,
    name: `Conta ${role}`,
    email: `${id}@example.invalid`,
    emailVerified: true,
    role,
    mustChangePassword,
  });
  await db.insert(account).values({
    id,
    accountId: id,
    providerId: 'credential',
    userId: id,
    password: await context.password.hash(password),
  });
  return id;
}

/** Entra pela API do servidor e põe os cookies da sessão no pote. */
async function signInAs(id: string) {
  jar.clear();
  const { headers } = await auth.api.signInEmail({
    body: { email: `${id}@example.invalid`, password },
    returnHeaders: true,
  });
  for (const cookie of headers.getSetCookie()) {
    const [pair] = cookie.split(';');
    const separator = pair!.indexOf('=');
    jar.set(pair!.slice(0, separator), decodeURIComponent(pair!.slice(separator + 1)));
  }
}

function visitForm(studentId: string, extra: Record<string, string> = {}) {
  const form = new FormData();
  form.set('aluna', studentId);
  form.set('voltar', '/admin/chamados');
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return form;
}

async function logOf(studentId: string) {
  return db
    .select()
    .from(supportImpersonationLog)
    .where(eq(supportImpersonationLog.studentId, studentId))
    .orderBy(supportImpersonationLog.createdAt);
}

async function redirectOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('redirect:'))
      return error.message.slice(9);
    throw error;
  }
  throw new Error('esperava um redirect');
}

const adminId = await createAccount('admin');
const agentId = await createAccount('user,support_agent');
const studentId = await createAccount('user');

beforeEach(async () => {
  await signInAs(adminId);
});

afterAll(async () => {
  await db.delete(supportImpersonationLog).where(inArray(supportImpersonationLog.staffId, users));
  await db.delete(user).where(inArray(user.id, users));
  await db.$client.end();
});

test('o admin entra, age com o próprio nome registrado e volta ao painel', async () => {
  const started = await startVisit(visitForm(studentId, { destino: '/sll/cursos' }));
  expect(started).toEqual({ ok: true, redirectTo: '/sll/cursos' });

  const visit = await getVisit();
  expect(visit?.studentId).toBe(studentId);
  expect(visit?.staffId).toBe(adminId);
  expect(visit?.over).toBe(false);

  // Permitida: roda e fica registrada com o nome de quem entrou, inclusive quando redireciona.
  expect(await runAsStudent('saveBrandName', async () => 'feito')).toBe('feito');
  expect(
    await redirectOf(() =>
      runAsStudent('chooseExpert', async () => {
        throw Object.assign(new Error('redirect:/sll/plano?resultado=ok'), {
          digest: 'NEXT_REDIRECT;replace;/sll/plano?resultado=ok;307;',
        });
      }),
    ),
  ).toBe('/sll/plano?resultado=ok');

  expect(await leaveVisit()).toEqual({ end: 'returned' });
  const state = await getSessionState();
  expect(state.status === 'active' ? state.session.user.id : null).toBe(adminId);

  const log = await logOf(studentId);
  expect(log.map((row) => [row.kind, row.action, row.staffId, row.path])).toEqual([
    ['started', 'entrar como aluna', adminId, null],
    ['action', 'saveBrandName', adminId, null],
    ['action', 'chooseExpert', adminId, '/sll/plano'],
    ['ended', 'voltar ao painel', adminId, null],
  ]);
  expect(new Set(log.map((row) => row.sessionId)).size).toBe(1);
});

test('ação bloqueada é recusada e registrada como recusa', async () => {
  await startVisit(visitForm(studentId));
  const form = new FormData();
  form.set('name', 'Outro nome');
  expect(await redirectOf(() => updateName(undefined, form))).toBe(
    '/visita-bloqueada?acao=updateName',
  );
  const [student] = await db.select({ name: user.name }).from(user).where(eq(user.id, studentId));
  expect(student?.name).toBe('Conta user');
  const refused = (await logOf(studentId)).filter((row) => row.kind === 'refused');
  expect(refused.at(-1)?.action).toBe('updateName');
  await leaveVisit();
});

test('a visita não marca presença nem leitura da aluna', async () => {
  await startVisit(visitForm(studentId));
  const response = await presence(
    new Request(`${origin}/api/presence`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ path: '/sll' }),
    }),
  );
  expect(response.status).toBe(204);
  expect(await db.select().from(userPresence).where(eq(userPresence.userId, studentId))).toEqual(
    [],
  );
  expect(await markMyTicketRead(1, randomUUID())).toBeUndefined();
  expect((await logOf(studentId)).some((row) => row.action === 'markMyTicketRead')).toBe(false);
  await leaveVisit();
});

test('depois de 1 hora tudo é recusado, mas ainda dá pra voltar ao painel', async () => {
  await startVisit(visitForm(studentId));
  const visit = await getVisit();
  await db
    .update(session)
    .set({ createdAt: new Date(Date.now() - 61 * 60 * 1000) })
    .where(eq(session.id, visit!.sessionId));

  expect((await getSessionState()).status).toBe('visit_over');
  expect(await redirectOf(() => runAsStudent('saveBrandName', async () => 'feito'))).toBe(
    '/visita-encerrada',
  );
  expect(await leaveVisit()).toEqual({ end: 'returned' });
  const state = await getSessionState();
  expect(state.status === 'active' ? state.session.user.id : null).toBe(adminId);
});

test('conta da equipe, a própria e aluna sem senha criada são recusadas', async () => {
  const pending = await createAccount('user', true);
  expect(await startVisit(visitForm(agentId))).toEqual({
    ok: false,
    message: 'Contas da equipe não podem ser acessadas.',
  });
  expect(await startVisit(visitForm(adminId))).toEqual({
    ok: false,
    message: 'Essa é a sua própria conta.',
  });
  expect(await startVisit(visitForm(pending))).toEqual({
    ok: false,
    message: 'A aluna ainda não criou a senha.',
  });
  // O próprio plugin também recusa a equipe como alvo, mesmo chamado direto.
  expect(
    auth.api.impersonateUser({
      body: { userId: agentId },
      headers: await (await nextHeaders().headers)(),
    }),
  ).rejects.toThrow();
  expect(await getVisit()).toBeNull();
});

test('quem não é admin não entra como aluna', async () => {
  await signInAs(agentId);
  expect(await startVisit(visitForm(studentId))).toEqual({
    ok: false,
    message: 'Você não tem acesso a isso.',
  });
  const started = await db
    .select()
    .from(supportImpersonationLog)
    .where(
      and(
        eq(supportImpersonationLog.staffId, agentId),
        eq(supportImpersonationLog.kind, 'started'),
      ),
    );
  expect(started).toEqual([]);
});

test('a rota HTTP do plugin admin está desligada', async () => {
  const response = await auth.handler(
    new Request(`${origin}/api/auth/admin/impersonate-user`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ userId: studentId }),
    }),
  );
  expect(response.status).toBe(404);
});

test('se a sessão da equipe não volta, a visita é apagada e a pessoa entra de novo', async () => {
  await startVisit(visitForm(studentId));
  const visit = await getVisit();
  // Cookie da volta perdido (outro aparelho, cookie apagado): o plugin não devolve a sessão.
  const context = await auth.$context;
  jar.delete(context.createAuthCookie('admin_session').name);
  expect(await leaveVisit()).toEqual({ end: 'signed_out' });
  expect(await getVisit()).toBeNull();
  expect(await db.select().from(session).where(eq(session.id, visit!.sessionId))).toEqual([]);
  const log = await logOf(studentId);
  expect(log.at(-1)?.action).toBe('saída sem devolver a sessão');
});

test('visita abandonada que venceu sozinha ganha a saída "expirou" na próxima entrada', async () => {
  await startVisit(visitForm(studentId));
  const abandoned = await getVisit();
  // A aba foi fechada sem "Voltar ao painel" e a sessão do plugin venceu.
  await db
    .update(session)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(session.id, abandoned!.sessionId));
  await signInAs(adminId);
  await startVisit(visitForm(studentId));
  await leaveVisit();
  const ended = (await logOf(studentId)).filter(
    (row) => row.sessionId === abandoned!.sessionId && row.kind === 'ended',
  );
  expect(ended.map((row) => row.action)).toEqual(['expirou']);
});

test('a aula do SLL aberta na visita responde JSON neutro, sem erro na tela', async () => {
  await startVisit(visitForm(studentId));
  const response = await lessonView(
    new Request(`${origin}/api/sll/progress/view`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ trackId: randomUUID(), lessonId: randomUUID() }),
    }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ saved: false, message: '' });
  await leaveVisit();
});

test('numa requisição, o wrapper e as guardas leem a sessão uma vez só', async () => {
  const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
  sameRequest = new Headers({ cookie, origin, host: new URL(origin).host });
  const reads = spyOn(auth.api, 'getSession');
  try {
    await runAsStudent('saveBrandName', async () => {
      await getActiveSession();
      await getSessionState();
      await runAsStudent('chooseExpert', async () => getVisit());
    });
    expect(reads).toHaveBeenCalledTimes(1);
  } finally {
    reads.mockRestore();
    sameRequest = null;
  }
});
