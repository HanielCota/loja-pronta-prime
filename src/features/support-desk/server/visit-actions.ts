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
import { endVisit, STAFF_HOME } from '@/features/support/server/impersonation';
import {
  startVisitSchema,
  visitDestination,
  visitRefusalReason,
} from '@/features/support/visit-target';

export type VisitStartResult = { ok: true; redirectTo: string } | { ok: false; message: string };

/** O chamado que motivou a visita vai pro registro da entrada e pro histórico do chamado. */
async function linkTicket(number: number, staffId: string, sessionId: string): Promise<void> {
  const [ticket] = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(eq(supportTickets.number, number))
    .limit(1);
  if (!ticket) return;
  await db
    .update(supportImpersonationLog)
    .set({ ticketId: ticket.id })
    .where(
      and(
        eq(supportImpersonationLog.sessionId, sessionId),
        eq(supportImpersonationLog.kind, 'started'),
      ),
    );
  await db
    .insert(supportTicketEvents)
    .values({ ticketId: ticket.id, actorId: staffId, type: 'impersonation_started' });
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
    numero: form.get('numero') || undefined,
    destino: form.get('destino') || undefined,
  });
  if (!parsed.success) return { ok: false, message: 'Conta não encontrada.' };
  const { aluna, numero, destino } = parsed.data;

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
    const visit = await auth.api.impersonateUser({
      body: { userId: aluna },
      headers: await headers(),
    });
    sessionId = visit.session.id;
  } catch (error) {
    console.error('[support-desk] não foi possível entrar na conta.', {
      error: error instanceof Error ? error.message : 'desconhecido',
    });
    return { ok: false, message: 'Não foi possível entrar na conta agora. Tente de novo.' };
  }
  if (numero) {
    await linkTicket(numero, session.user.id, sessionId).catch((error: unknown) =>
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
export async function leaveVisit(): Promise<{ ok: boolean }> {
  return { ok: await endVisit() };
}

/** "Voltar ao painel" sem JavaScript. Sem visita a encerrar, vai pro login (a sessão já acabou). */
export async function leaveVisitForm(): Promise<void> {
  const ended = await endVisit();
  redirect(ended ? STAFF_HOME : '/entrar');
}
