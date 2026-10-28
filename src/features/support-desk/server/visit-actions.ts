'use server';

import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import {
  supportImpersonationLog,
  supportTicketEvents,
  supportTickets,
  user,
} from '@/server/db/schema';
import { auth } from '@/server/auth/auth';
import { readStaffSession } from '@/features/support/server/staff-guard';
import { endVisit, type VisitEnd } from '@/features/support/server/impersonation';
import { closeOpenVisits, withStaffVisitLock } from '@/features/support/server/visit-lock';
import {
  startVisitSchema,
  ticketNumberOf,
  visitDestination,
  visitRefusalReason,
} from '@/features/support/visit-target';
import { STAFF_HOME } from '@/features/support/visit-window';

export type VisitStartResult = { ok: true; redirectTo: string } | { ok: false; message: string };

/**
 * O chamado que motivou a visita vai pro registro da entrada e pro histórico do chamado. Só um
 * chamado da própria aluna: um número trocado no formulário não suja o histórico de outra.
 */
async function linkTicket(
  number: number,
  visit: { staffId: string; studentId: string; sessionId: string },
): Promise<void> {
  const [ticket] = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(and(eq(supportTickets.number, number), eq(supportTickets.requesterId, visit.studentId)))
    .limit(1);
  if (!ticket) return;
  await db
    .update(supportImpersonationLog)
    .set({ ticketId: ticket.id })
    .where(
      and(
        eq(supportImpersonationLog.sessionId, visit.sessionId),
        eq(supportImpersonationLog.kind, 'started'),
      ),
    );
  await db
    .insert(supportTicketEvents)
    .values({ ticketId: ticket.id, actorId: visit.staffId, type: 'impersonation_started' });
}

/**
 * "Entrar como aluna" (só quem tem `support.impersonate`, hoje o administrador): abre a sessão da
 * aluna pelo plugin admin, que grava o cookie pelo `nextCookies`. A entrada é registrada no hook
 * de criação da sessão (`auth.ts`); aqui só se liga o chamado a ela.
 */
export async function startVisit(form: FormData): Promise<VisitStartResult> {
  const session = await readStaffSession('support.impersonate');
  if (!session) return { ok: false, message: 'Você não tem acesso a isso.' };
  const parsed = startVisitSchema.safeParse({
    aluna: form.get('aluna'),
    destino: form.get('destino') || undefined,
  });
  if (!parsed.success) return { ok: false, message: 'Conta não encontrada.' };
  const { aluna, destino } = parsed.data;
  // Número de chamado inválido não impede a visita: ela só fica sem chamado ligado.
  const ticketNumber = ticketNumberOf(form.get('numero'));

  const [target] = await db
    .select({
      id: user.id,
      role: user.role,
      banned: user.banned,
      mustChangePassword: user.mustChangePassword,
    })
    .from(user)
    .where(eq(user.id, aluna))
    .limit(1);
  const refusal = visitRefusalReason(target ?? null, session.user.id);
  if (refusal) return { ok: false, message: refusal };

  let sessionId: string;
  try {
    // Um clique duplo espera o primeiro terminar; a visita anterior aberta é encerrada.
    sessionId = await withStaffVisitLock(session.user.id, async () => {
      await closeOpenVisits(session.user.id);
      const visit = await auth.api.impersonateUser({
        body: { userId: aluna },
        headers: await headers(),
      });
      return visit.session.id;
    });
  } catch (error) {
    console.error('[support-desk] não foi possível entrar na conta.', {
      error: error instanceof Error ? error.message : 'desconhecido',
    });
    return { ok: false, message: 'Não foi possível entrar na conta agora. Tente de novo.' };
  }
  if (ticketNumber !== null) {
    const visit = { staffId: session.user.id, studentId: aluna, sessionId };
    await linkTicket(ticketNumber, visit).catch((error: unknown) =>
      console.error('[support-desk] não foi possível ligar o chamado à visita.', {
        error: error instanceof Error ? error.message : 'desconhecido',
      }),
    );
  }
  return { ok: true, redirectTo: visitDestination(destino) };
}

/** Sem JavaScript, o formulário redireciona pelo servidor (a página carrega inteira de qualquer jeito). */
export async function startVisitForm(form: FormData): Promise<void> {
  const result = await startVisit(form);
  if (!result.ok) {
    const back = form.get('voltar');
    redirect(typeof back === 'string' && /^\/admin\/[\w/-]*$/.test(back) ? back : STAFF_HOME);
  }
  redirect(result.redirectTo);
}

/** "Voltar ao painel" com JavaScript: o navegador recarrega a página inteira depois. */
export async function leaveVisit(): Promise<{ end: VisitEnd }> {
  return { end: await endVisit() };
}

/**
 * "Voltar ao painel" sem JavaScript. Quando a sessão da equipe não voltou (ou a visita já tinha
 * acabado), vai pro login.
 */
export async function leaveVisitForm(): Promise<void> {
  const end = await endVisit();
  redirect(end === 'returned' ? STAFF_HOME : '/entrar');
}
