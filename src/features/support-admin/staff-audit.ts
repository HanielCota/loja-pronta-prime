/**
 * O que a equipe faz na equipe e nas configurações do suporte, registrado com quem fez e quando
 * (a tela de Auditoria lê daqui). O código da ação nunca muda; o texto pode mudar.
 */

export const STAFF_AUDIT_AREAS = ['team', 'settings'] as const;
export type StaffAuditArea = (typeof STAFF_AUDIT_AREAS)[number];

export const STAFF_AUDIT_ACTIONS = {
  'team.invited': 'convidou para a equipe',
  'team.role_changed': 'mudou o cargo',
  'team.removed': 'tirou da equipe',
  'team.blocked': 'bloqueou',
  'team.unblocked': 'desbloqueou',
  'settings.hours_saved': 'mudou o horário de atendimento',
  'settings.holiday_added': 'adicionou um feriado',
  'settings.holiday_removed': 'removeu um feriado',
  'settings.pause_started': 'pôs o suporte em pausa',
  'settings.pause_ended': 'tirou o suporte da pausa',
  'settings.deadlines_saved': 'mudou os prazos de resposta',
  'settings.distribution_saved': 'mudou a distribuição de chamados',
  'settings.retention_saved': 'mudou a guarda de dados',
  'settings.topic_saved': 'mudou um tema',
  'settings.template_saved': 'mudou uma resposta pronta',
  'settings.faq_saved': 'mudou uma resposta automática',
  'settings.known_issue_published': 'publicou um aviso',
  'settings.known_issue_ended': 'encerrou um aviso',
} as const;
export type StaffAuditAction = keyof typeof STAFF_AUDIT_ACTIONS;

/** A área sai do próprio código da ação ("team.invited" é da equipe). */
export function staffAuditArea(action: StaffAuditAction): StaffAuditArea {
  return action.startsWith('team.') ? 'team' : 'settings';
}

/** A frase da auditoria: "Rafael convidou para a equipe". Conta apagada aparece sem nome. */
export function describeStaffAction(actorName: string | null, action: StaffAuditAction): string {
  return `${actorName ?? 'Conta excluída'} ${STAFF_AUDIT_ACTIONS[action]}`;
}
