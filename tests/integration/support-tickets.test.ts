import { afterAll, beforeAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  hiddenUserPresence,
  userPresence,
  supportTicketAttachments,
  staffAuditLog,
  supportTicketEvents,
  supportTicketMessages,
  supportTickets,
  user,
} from '@/server/db/schema';

// O worker apaga anexos vencidos e manda e-mails: aqui nada disso pode sair da máquina.
// O bucket é falso: `failPut` simula o provedor recusando a credencial.
const bucket = { failPut: false, puts: 0, failRemove: false, removals: [] as string[] };
mock.module('@/server/storage', () => ({
  storage: () => ({
    put: async () => {
      if (bucket.failPut)
        throw Object.assign(
          new Error('The AWS Access Key Id you provided does not exist in our records.'),
          { name: 'InvalidAccessKeyId' },
        );
      bucket.puts += 1;
    },
    remove: async (key: string) => {
      if (bucket.failRemove) throw new Error('Storage unavailable');
      bucket.removals.push(key);
    },
    delete: async () => {},
  }),
}));
mock.module('@/server/email/send', () => ({
  absoluteUrl: (path: string) => `http://localhost${path}`,
  sendEmailInBackground: () => {},
}));

const { appendRequesterMessage, appendStaffMessage, createTicket, markTicketRead } =
  await import('@/features/support/server/tickets');
const { closeIdleTickets, applyRetention } = await import('@/features/support/server/maintenance');
const { getStaffTicket } = await import('@/features/support-desk/server/queries');
const { countMyUnread, listMyTickets } = await import('@/features/support/server/queries');

const studentId = randomUUID();
const agentId = randomUUID();
const ticketIds: string[] = [];
const DAY_MS = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  await db.insert(user).values([
    {
      id: studentId,
      name: 'Aluna',
      email: `${studentId}@example.invalid`,
      mustChangePassword: false,
    },
    {
      id: agentId,
      name: 'Atendente',
      email: `${agentId}@example.invalid`,
      role: 'support_agent',
      mustChangePassword: false,
    },
  ]);
});

afterAll(async () => {
  if (ticketIds.length)
    await db.delete(supportTickets).where(inArray(supportTickets.id, ticketIds));
  await db.delete(user).where(inArray(user.id, [studentId, agentId]));
  await db.$client.end();
});

const agent = { id: agentId, name: 'Atendente', role: 'support_agent' };

async function openTicket() {
  const ticket = await createTicket({
    planned: {
      topicId: 'access',
      situationId: null,
      priority: 'normal',
      queue: 'general',
      subject: 'Não consigo entrar',
      description: 'A senha não funciona desde ontem à noite.',
    },
    requester: { id: studentId, email: `${studentId}@example.invalid`, name: 'Aluna' },
    channel: 'platform',
    context: { product: null, lessonId: null, storePhase: null, errorDigest: null, pagePath: null },
    assistantAnswerId: null,
    defaultAssigneeId: null,
    attachments: [],
    submissionId: null,
  });
  ticketIds.push(ticket.id);
  return ticket;
}

/** Leva a resposta pública da equipe pra N dias atrás (o relógio do teste não anda). */
async function ageStaffReplies(ticketId: string, days: number) {
  await db
    .update(supportTicketMessages)
    .set({ createdAt: new Date(Date.now() - days * DAY_MS) })
    .where(
      and(eq(supportTicketMessages.ticketId, ticketId), eq(supportTicketMessages.fromStaff, true)),
    );
}

test('resposta já encerrando continua aparecendo como nova pra aluna', async () => {
  const ticket = await openTicket();
  await appendStaffMessage(
    ticket.id,
    agent,
    { body: 'Resolvido.', internal: false, statusAfter: 'closed' },
    [],
  );
  const { rows } = await listMyTickets(studentId, { q: '', status: 'closed', page: 1 });
  expect(rows.find((row) => row.number === ticket.number)?.unread).toBe(true);
});

test('depois de ler a última resposta, ela deixa de ser nova', async () => {
  const ticket = await openTicket();
  await appendStaffMessage(
    ticket.id,
    agent,
    { body: 'Veja agora.', internal: false, statusAfter: 'answered' },
    [],
  );
  const unreadBefore = await countMyUnread(studentId);
  const [last] = await db
    .select({ id: supportTicketMessages.id })
    .from(supportTicketMessages)
    .where(eq(supportTicketMessages.ticketId, ticket.id))
    .orderBy(desc(supportTicketMessages.createdAt))
    .limit(1);
  await markTicketRead(ticket.id, studentId, last?.id ?? '');
  const { rows } = await listMyTickets(studentId, { q: '', status: '', page: 1 });
  expect(rows.find((row) => row.number === ticket.number)?.unread).toBe(false);
  expect(await countMyUnread(studentId)).toBe(unreadBefore - 1);
});

test('eventos do mesmo instante mantêm a ordem em que aconteceram', async () => {
  const ticket = await openTicket();
  await appendStaffMessage(
    ticket.id,
    agent,
    { body: 'Olá!', internal: false, statusAfter: 'answered' },
    [],
  );
  const events = await db
    .select({ type: supportTicketEvents.type, createdAt: supportTicketEvents.createdAt })
    .from(supportTicketEvents)
    .where(eq(supportTicketEvents.ticketId, ticket.id))
    .orderBy(asc(supportTicketEvents.id));
  expect(events.map((event) => event.type)).toEqual(['assigned', 'status_changed']);
  // Gravados na mesma transação: o horário empata, quem desempata é o id.
  expect(events[0]?.createdAt.getTime()).toBe(events[1]?.createdAt.getTime());
});

test('nota interna depois da resposta não adia o encerramento automático', async () => {
  const idle = await openTicket();
  await appendStaffMessage(
    idle.id,
    agent,
    { body: 'Tente agora.', internal: false, statusAfter: 'answered' },
    [],
  );
  await ageStaffReplies(idle.id, 8);
  // A nota é de hoje e mexe no `updated_at`, mas não é retorno pra aluna.
  await appendStaffMessage(
    idle.id,
    agent,
    { body: 'Aguardando a aluna.', internal: true, statusAfter: 'answered' },
    [],
  );

  const recent = await openTicket();
  await appendStaffMessage(
    recent.id,
    agent,
    { body: 'Tente agora.', internal: false, statusAfter: 'answered' },
    [],
  );
  await ageStaffReplies(recent.id, 2);

  await closeIdleTickets();
  const rows = await db
    .select({
      id: supportTickets.id,
      status: supportTickets.status,
      closedReason: supportTickets.closedReason,
    })
    .from(supportTickets)
    .where(inArray(supportTickets.id, [idle.id, recent.id]));
  expect(rows.find((row) => row.id === idle.id)).toMatchObject({
    status: 'closed',
    closedReason: 'automatic',
  });
  expect(rows.find((row) => row.id === recent.id)?.status).toBe('answered');

  const [closing] = await db
    .select({ automatic: supportTicketEvents.automatic, actorId: supportTicketEvents.actorId })
    .from(supportTicketEvents)
    .where(
      and(eq(supportTicketEvents.ticketId, idle.id), eq(supportTicketEvents.toValue, 'closed')),
    );
  expect(closing).toEqual({ automatic: true, actorId: null });
});

test('conta da atendente apagada: os eventos ficam, sem nome e sem virar automáticos', async () => {
  const ticket = await openTicket();
  await appendStaffMessage(
    ticket.id,
    agent,
    { body: 'Já vejo isso.', internal: false, statusAfter: 'answered' },
    [],
  );
  const departing = randomUUID();
  await db.insert(user).values({
    id: departing,
    name: 'Saiu da equipe',
    email: `${departing}@example.invalid`,
    role: 'support_supervisor',
    mustChangePassword: false,
  });
  await db
    .update(supportTicketEvents)
    .set({ actorId: departing })
    .where(eq(supportTicketEvents.ticketId, ticket.id));
  await db.delete(user).where(eq(user.id, departing));

  const events = await db
    .select({ actorId: supportTicketEvents.actorId, automatic: supportTicketEvents.automatic })
    .from(supportTicketEvents)
    .where(eq(supportTicketEvents.ticketId, ticket.id));
  expect(events.length).toBeGreaterThan(0);
  for (const event of events) expect(event).toEqual({ actorId: null, automatic: false });
});

const { openTicket: openTicketFlow } = await import('@/features/support/server/new-ticket');
const { storeAttachments, attachmentErrorMessage } =
  await import('@/features/support/server/attachments');
const { recordStaffAction } = await import('@/features/support-admin/server/audit');

const pngBytes = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
    '1f15c4890000000d49444154789c636000020000050001e226059b0000000049454e44ae426082',
  'hex',
);
const file = (name: string, bytes: Uint8Array, type: string) =>
  new File([new Uint8Array(bytes)], name, { type });

test('o mesmo envio repetido não abre dois chamados', async () => {
  const submissionId = randomUUID();
  const student = randomUUID();
  await db.insert(user).values({
    id: student,
    name: 'Aluna nova',
    email: `${student}@example.invalid`,
    mustChangePassword: false,
  });
  const draft = {
    requester: { id: student, email: `${student}@example.invalid`, name: 'Aluna nova' },
    channel: 'platform' as const,
    draft: {
      topicId: 'access',
      situationId: 'cant-login',
      description: 'não consigo entrar no celular desde ontem',
    },
    context: { product: null, lessonId: null, storePhase: null, errorDigest: null, pagePath: null },
    assistantAnswerId: null,
    files: [],
    submissionId,
  };
  const [first, second] = await Promise.all([openTicketFlow(draft), openTicketFlow(draft)]);
  expect(first.ok && second.ok).toBe(true);
  if (!first.ok || !second.ok) return;
  ticketIds.push(first.ticket.id);
  expect(second.ticket.id).toBe(first.ticket.id);
  const rows = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(eq(supportTickets.submissionId, submissionId));
  expect(rows.length).toBe(1);
  await db.delete(supportTickets).where(eq(supportTickets.submissionId, submissionId));
  await db.delete(user).where(eq(user.id, student));
});

test('um anexo ruim fica de fora e os bons entram', async () => {
  bucket.failPut = false;
  bucket.puts = 0;
  const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
  const { stored, refused } = await storeAttachments(randomUUID(), [
    file('ok1.png', pngBytes, 'image/png'),
    file('virus.png', exe, 'image/png'),
    file('ok2.png', pngBytes, 'image/png'),
  ]);
  expect(stored.map((item) => item.fileName)).toEqual(['ok1.png', 'ok2.png']);
  expect(refused).toEqual([{ name: 'virus.png', reason: 'type' }]);
  expect(stored.every((item) => !item.storageKey.includes('ok'))).toBe(true);
});

test('falha do bucket vira uma frase em português, sem a mensagem do provedor', async () => {
  bucket.failPut = true;
  const failure = await storeAttachments(randomUUID(), [
    file('print.png', pngBytes, 'image/png'),
  ]).catch((error: unknown) => error);
  bucket.failPut = false;
  const message = attachmentErrorMessage(failure);
  expect(message).not.toContain('AWS');
  expect(message).toContain('Não foi possível guardar os arquivos');
});

test('ação da equipe fica registrada e sobrevive à conta apagada, sem nome', async () => {
  const owner = randomUUID();
  await db.insert(user).values({
    id: owner,
    name: 'Dona',
    email: `${owner}@example.invalid`,
    role: 'admin',
    mustChangePassword: false,
  });
  await recordStaffAction({ actorId: owner, action: 'team.blocked', targetId: agentId });
  await db.delete(user).where(eq(user.id, owner));
  const [entry] = await db
    .select({
      actorId: staffAuditLog.actorId,
      area: staffAuditLog.area,
      action: staffAuditLog.action,
      targetId: staffAuditLog.targetId,
    })
    .from(staffAuditLog)
    .where(eq(staffAuditLog.targetId, agentId));
  expect(entry).toEqual({ actorId: null, area: 'team', action: 'team.blocked', targetId: agentId });
  await db.delete(staffAuditLog).where(eq(staffAuditLog.targetId, agentId));
});

test('requester context hides ombudsman tickets from agents but keeps them for supervisors', async () => {
  const current = await openTicket();
  const complaint = await openTicket();
  await db
    .update(supportTickets)
    .set({ queue: 'ombudsman', subject: 'Private complaint' })
    .where(eq(supportTickets.id, complaint.id));
  const agentView = await getStaffTicket(current.number, agent);
  expect(
    agentView?.requester?.otherTickets.some((ticket) => ticket.number === complaint.number),
  ).toBe(false);
  const supervisorView = await getStaffTicket(current.number, {
    ...agent,
    role: 'support_supervisor',
  });
  expect(
    supervisorView?.requester?.otherTickets.some((ticket) => ticket.number === complaint.number),
  ).toBe(true);
});

test('support requester context respects hidden presence', async () => {
  const current = await openTicket();
  await db.insert(userPresence).values({ userId: studentId, path: '/sll', lastSeenAt: new Date() });
  try {
    const visible = await getStaffTicket(current.number, agent);
    expect(visible?.requester?.online).toBe(true);
    await db.insert(hiddenUserPresence).values({ userId: studentId });
    const hidden = await getStaffTicket(current.number, agent);
    expect(hidden?.requester?.lastSeenAt).toBeNull();
    expect(hidden?.requester?.online).toBe(false);
  } finally {
    await db.delete(hiddenUserPresence).where(eq(hiddenUserPresence.userId, studentId));
    await db.delete(userPresence).where(eq(userPresence.userId, studentId));
  }
});

test('retention retries failed bucket deletions and marks only successful deletions as purged', async () => {
  const current = await openTicket();
  const [message] = await db
    .select({ id: supportTicketMessages.id })
    .from(supportTicketMessages)
    .where(eq(supportTicketMessages.ticketId, current.id));
  const key = `support/${current.id}/retention.png`;
  const [attachment] = await db
    .insert(supportTicketAttachments)
    .values({
      ticketId: current.id,
      messageId: message!.id,
      storageKey: key,
      fileName: 'retention.png',
      mimeType: 'image/png',
      sizeBytes: 1,
    })
    .returning({ id: supportTicketAttachments.id });
  await db
    .update(supportTickets)
    .set({ status: 'closed', closedAt: new Date(Date.now() - 200 * DAY_MS) })
    .where(eq(supportTickets.id, current.id));
  const readAttachment = async () =>
    (
      await db
        .select()
        .from(supportTicketAttachments)
        .where(eq(supportTicketAttachments.id, attachment!.id))
    )[0]!;
  bucket.failRemove = true;
  try {
    await applyRetention();
    expect((await readAttachment()).purgedAt).toBeNull();
  } finally {
    bucket.failRemove = false;
  }
  await applyRetention();
  expect((await readAttachment()).purgedAt).toBeInstanceOf(Date);
  expect(bucket.removals).toContain(key);
});

test('ten concurrent replies use the transaction connection without exhausting the pool', async () => {
  const ticket = await openTicket();
  const results = await Promise.allSettled(
    Array.from({ length: 10 }, (_, index) =>
      appendRequesterMessage(
        ticket.id,
        { id: studentId, name: 'Concurrent requester' },
        `Reply ${index}`,
        [],
      ),
    ),
  );
  expect(results.filter((result) => result.status === 'rejected')).toEqual([]);
  const messages = await db
    .select()
    .from(supportTicketMessages)
    .where(eq(supportTicketMessages.ticketId, ticket.id));
  expect(messages).toHaveLength(11);
}, 15000);

test('concurrent submissions enforce the three-ticket account limit and retain idempotency', async () => {
  const id = randomUUID();
  await db
    .insert(user)
    .values({ id, email: `${id}@example.invalid`, name: 'Concurrent requester' });
  const input = {
    requester: { id, email: `${id}@example.invalid`, name: 'Concurrent requester' },
    channel: 'platform' as const,
    draft: { topicId: 'access', situationId: 'cant-login', description: 'Concurrent submission' },
    context: { product: null, lessonId: null, storePhase: null, errorDigest: null, pagePath: null },
    assistantAnswerId: null,
    files: [],
    submissionId: randomUUID(),
  };
  try {
    const inputs = Array.from({ length: 4 }, () => ({ ...input, submissionId: randomUUID() }));
    const outcomes = await Promise.all(inputs.map(openTicketFlow));
    expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(3);
    expect(outcomes.filter((outcome) => !outcome.ok && outcome.status === 429)).toHaveLength(1);
    const rows = await db.select().from(supportTickets).where(eq(supportTickets.requesterId, id));
    expect(rows).toHaveLength(3);
    const successful = inputs[outcomes.findIndex((outcome) => outcome.ok)]!;
    expect((await openTicketFlow(successful)).ok).toBe(true);
  } finally {
    await db.delete(supportTickets).where(eq(supportTickets.requesterId, id));
    await db.delete(user).where(eq(user.id, id));
  }
});
