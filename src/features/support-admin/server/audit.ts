import { db } from '@/server/db';
import { staffAuditLog } from '@/server/db/schema';
import { staffAuditArea, type StaffAuditAction } from '../staff-audit';

export type StaffAuditEntry = {
  actorId: string;
  action: StaffAuditAction;
  targetId?: string | null;
  detail?: Record<string, string | number | boolean | null>;
};

/**
 * Registra uma ação da equipe. A ação já aconteceu: se o registro falhar, a pessoa não perde o que
 * fez, mas o log avisa (com o código da ação, sem dado pessoal) pra o buraco na auditoria aparecer.
 */
export async function recordStaffAction(entry: StaffAuditEntry): Promise<void> {
  try {
    await db.insert(staffAuditLog).values({
      actorId: entry.actorId,
      area: staffAuditArea(entry.action),
      action: entry.action,
      targetId: entry.targetId ?? null,
      detail: entry.detail ?? null,
    });
  } catch (error) {
    console.error(
      `[audit] ação da equipe não registrada: ${entry.action} (${error instanceof Error ? error.name : 'erro'})`,
    );
  }
}
