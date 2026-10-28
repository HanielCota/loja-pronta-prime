import { describe, expect, test } from 'bun:test';
import {
  describeStaffAction,
  STAFF_AUDIT_ACTIONS,
  staffAuditArea,
  type StaffAuditAction,
} from './staff-audit';

describe('ações registradas da equipe', () => {
  test('toda ação tem área conhecida e frase em português', () => {
    for (const action of Object.keys(STAFF_AUDIT_ACTIONS) as StaffAuditAction[]) {
      expect(['team', 'settings']).toContain(staffAuditArea(action));
      expect(STAFF_AUDIT_ACTIONS[action].length).toBeGreaterThan(3);
    }
  });

  test('a área vem do código da ação', () => {
    expect(staffAuditArea('team.blocked')).toBe('team');
    expect(staffAuditArea('settings.holiday_added')).toBe('settings');
  });

  test('conta apagada aparece sem nome', () => {
    expect(describeStaffAction('Rafael', 'team.invited')).toBe('Rafael convidou para a equipe');
    expect(describeStaffAction(null, 'team.blocked')).toBe('Conta excluída bloqueou');
  });
});
