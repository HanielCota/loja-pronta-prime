import { afterAll, expect, mock, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { supportTicketAttachments, supportTickets } from '@/server/db/schema';

const removed: string[] = [];
let failLink = true;
let links = 0;
mock.module('@/server/storage', () => ({
  storage: () => ({
    put: async () => {},
    remove: async (key: string) => {
      removed.push(key);
    },
  }),
}));
mock.module('@/features/support/server/notify', () => ({
  notifyTicketCreated: async () => {},
  sendPublicTicketLink: async () => {
    links++;
    if (failLink) throw new Error('Link persistence unavailable');
  },
}));
const { openTicket } = await import('@/features/support/server/new-ticket');
const submissionId = randomUUID();
afterAll(async () => {
  await db.delete(supportTickets).where(eq(supportTickets.submissionId, submissionId));
  await db.$client.end();
});

test('access link failure preserves committed attachments and retry resends without duplicates', async () => {
  const png = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c636000020000050001e226059b0000000049454e44ae426082',
    'hex',
  );
  const input = {
    requester: { id: null, name: 'Submission recovery', email: `${submissionId}@example.invalid` },
    channel: 'public_form' as const,
    draft: { topicId: 'access', situationId: 'cant-login', description: 'Submission recovery' },
    context: { product: null, lessonId: null, storePhase: null, errorDigest: null, pagePath: null },
    assistantAnswerId: null,
    files: [new File([png], 'evidence.png', { type: 'image/png' })],
    submissionId,
  };
  const first = await openTicket(input);
  expect(first.ok).toBe(false);
  const tickets = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.submissionId, submissionId));
  expect(tickets).toHaveLength(1);
  const attachments = await db
    .select()
    .from(supportTicketAttachments)
    .where(eq(supportTicketAttachments.ticketId, tickets[0]!.id));
  expect(attachments).toHaveLength(1);
  expect(removed).toEqual([]);
  failLink = false;
  const retry = await openTicket(input);
  expect(retry.ok).toBe(true);
  expect(retry.ok && retry.ticket.id).toBe(tickets[0]!.id);
  expect(links).toBe(2);
  expect(removed).toEqual([]);
  expect(
    await db
      .select()
      .from(supportTicketAttachments)
      .where(eq(supportTicketAttachments.ticketId, tickets[0]!.id)),
  ).toHaveLength(1);
});
