import { describe, expect, test } from 'bun:test';
import {
  hasStaffPermission,
  isPlatformOwner,
  isStaffRole,
  parsePlatformOwners,
  staffRoleLabel,
  staffPanelLinkOf,
  staffRoleOf,
  withStaffRole,
} from './staff-access';

describe('cargos da equipe', () => {
  test('atendente responde e organiza, mas não distribui nem vê métricas', () => {
    expect(hasStaffPermission('support_agent', 'support.answer')).toBe(true);
    expect(hasStaffPermission('support_agent', 'support.triage')).toBe(true);
    expect(hasStaffPermission('support_agent', 'support.assign_others')).toBe(false);
    expect(hasStaffPermission('support_agent', 'support.metrics')).toBe(false);
    expect(hasStaffPermission('support_agent', 'support.ombudsman')).toBe(false);
  });

  test('supervisor distribui, cuida da Ouvidoria e vê o desempenho', () => {
    expect(hasStaffPermission('support_supervisor', 'support.assign_others')).toBe(true);
    expect(hasStaffPermission('support_supervisor', 'support.ombudsman')).toBe(true);
    expect(hasStaffPermission('support_supervisor', 'support.metrics')).toBe(true);
    expect(hasStaffPermission('support_supervisor', 'support.settings')).toBe(false);
    expect(hasStaffPermission('support_supervisor', 'support.impersonate')).toBe(false);
    expect(hasStaffPermission('support_supervisor', 'team.manage')).toBe(false);
  });

  test('administrador pode tudo', () => {
    expect(hasStaffPermission('admin', 'support.impersonate')).toBe(true);
    expect(hasStaffPermission('admin', 'team.manage')).toBe(true);
    expect(hasStaffPermission('user,admin', 'support.settings')).toBe(true);
  });

  test('aluna e conta sem função não são da equipe', () => {
    expect(isStaffRole('user')).toBe(false);
    expect(isStaffRole(null)).toBe(false);
    expect(isStaffRole('suporte')).toBe(false);
    expect(hasStaffPermission(undefined, 'support.answer')).toBe(false);
  });

  test('vale o cargo mais alto quando a conta tem vários', () => {
    expect(staffRoleOf('support_agent, support_supervisor')).toBe('support_supervisor');
    expect(staffRoleLabel('user,support_agent')).toBe('Atendente');
    expect(staffRoleLabel('user')).toBeNull();
  });

  test('o atalho do menu segue o cargo mais alto', () => {
    expect(staffPanelLinkOf('user')).toBeNull();
    expect(staffPanelLinkOf(null)).toBeNull();
    expect(staffPanelLinkOf('user,support_agent')).toBeNull();
    expect(staffPanelLinkOf('support_supervisor')).toBeNull();
    expect(staffPanelLinkOf('support_agent,admin')).toEqual({
      href: '/admin',
      label: 'Painel administrativo',
      roleLabel: 'Administrador',
    });
  });

  test('trocar o cargo mantém as outras funções', () => {
    expect(withStaffRole('user', 'support_agent')).toBe('user,support_agent');
    expect(withStaffRole('user,support_agent', 'support_supervisor')).toBe(
      'user,support_supervisor',
    );
    expect(withStaffRole('user,support_agent', null)).toBe('user');
    expect(withStaffRole('support_agent', null)).toBe('user');
    expect(withStaffRole(null, 'admin')).toBe('admin');
  });
});

describe('dono da plataforma', () => {
  const owners = parsePlatformOwners(
    ' Dona@Exemplo.com, ,outra@exemplo.com,dona@exemplo.com,sem-arroba',
  );
  const owner = { email: 'dona@exemplo.com', emailVerified: true, role: 'admin' };

  test('a lista ignora vazios, repetidos e o que não é e-mail', () => {
    expect(owners).toEqual(['dona@exemplo.com', 'outra@exemplo.com']);
    expect(parsePlatformOwners('')).toEqual([]);
    expect(parsePlatformOwners(undefined)).toEqual([]);
  });

  test('precisa estar na lista, com e-mail verificado e ser administrador', () => {
    expect(isPlatformOwner(owner, owners)).toBe(true);
    expect(isPlatformOwner({ ...owner, email: 'DONA@exemplo.com' }, owners)).toBe(true);
    expect(isPlatformOwner({ ...owner, emailVerified: false }, owners)).toBe(false);
    expect(isPlatformOwner({ ...owner, role: 'support_supervisor' }, owners)).toBe(false);
    expect(isPlatformOwner({ ...owner, email: 'admin@exemplo.com' }, owners)).toBe(false);
    expect(isPlatformOwner(owner, [])).toBe(false);
  });
});
