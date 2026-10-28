import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSessionState, needsFirstPassword } from '@/features/auth/server/session';
import { canSeeQueue, ticketFromPublicToken } from '@/features/support/server/tickets';
import { db } from '@/server/db';
import { supportTicketAttachments, supportTicketMessages, supportTickets } from '@/server/db/schema';
import { storage } from '@/server/storage';

const idSchema = z.uuid();

/**
 * Baixa um anexo. Só a dona do chamado (ou o link mágico dele) e a equipe com acesso à fila. Anexo
 * de nota interna nunca vai pra aluna. `?inline=1` mostra imagem no navegador; o resto baixa.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return new Response('Não encontrado.', { status: 404 });
  const [row] = await db
    .select({ file: supportTicketAttachments, ticket: supportTickets, internal: supportTicketMessages.internal })
    .from(supportTicketAttachments)
    .innerJoin(supportTickets, eq(supportTickets.id, supportTicketAttachments.ticketId))
    .innerJoin(supportTicketMessages, eq(supportTicketMessages.id, supportTicketAttachments.messageId))
    .where(eq(supportTicketAttachments.id, id))
    .limit(1);
  if (!row || row.file.purgedAt) return new Response('Não encontrado.', { status: 404 });

  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  let allowed = false;
  if (token) {
    const ticket = await ticketFromPublicToken(token);
    allowed = ticket?.id === row.ticket.id && !row.internal;
  }
  if (!allowed) {
    const state = await getSessionState();
    if (state.status === 'active' && !needsFirstPassword(state.session.user)) {
      const { user } = state.session;
      const isOwner = row.ticket.requesterId === user.id && !row.internal;
      allowed = isOwner || canSeeQueue(row.ticket.queue, user.role);
    }
  }
  if (!allowed) return new Response('Não encontrado.', { status: 404 });

  const bytes = await storage().get(row.file.storageKey);
  if (!bytes) return new Response('Não encontrado.', { status: 404 });
  const inline = url.searchParams.get('inline') === '1' && row.file.mimeType.startsWith('image/');
  return new Response(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: row.file.mimeType }), {
    headers: {
      'Content-Type': row.file.mimeType,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${row.file.fileName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
