import { db } from '@/server/db';
import { supportImpersonationLog } from '@/server/db/schema';

export type VisitLogEntry = {
  kind: 'started' | 'action' | 'refused' | 'ended';
  sessionId: string;
  staffId: string;
  studentId: string;
  action: string;
  path?: string | null;
  ticketId?: string | null;
};

/**
 * Grava um passo da visita da equipe na conta da aluna. O que ele registra já aconteceu (ou já foi
 * recusado), então uma falha aqui vai pro log e não desfaz nada. Sem conteúdo: só ids, o nome da
 * ação e o endereço.
 */
export async function recordVisitStep(entry: VisitLogEntry): Promise<void> {
  try {
    await db
      .insert(supportImpersonationLog)
      .values({
        kind: entry.kind,
        sessionId: entry.sessionId,
        staffId: entry.staffId,
        studentId: entry.studentId,
        action: entry.action,
        path: entry.path ?? null,
        ticketId: entry.ticketId ?? null,
      })
      // A saída repetida (clique duplo) bate no índice único e é ignorada.
      .onConflictDoNothing();
  } catch (error) {
    console.error('[support] registro da visita falhou.', {
      kind: entry.kind,
      sessionId: entry.sessionId,
      action: entry.action,
      error: error instanceof Error ? error.message : 'desconhecido',
    });
  }
}
