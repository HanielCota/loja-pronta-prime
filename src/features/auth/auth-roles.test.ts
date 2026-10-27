import { describe, expect, test } from 'bun:test';
import { admin } from 'better-auth/plugins';
import { ADMIN_PLUGIN_PATHS, AUTH_ADMIN_ROLES, authRoles } from './auth-roles';

const everyUserPower = [
  'create',
  'list',
  'set-role',
  'ban',
  'impersonate',
  'impersonate-admins',
  'delete',
  'set-password',
  'set-email',
  'get',
  'update',
] as const;

describe('papéis do plugin admin', () => {
  test('o suporte não ganha nenhum poder do plugin', () => {
    for (const role of [authRoles.user, authRoles.support_agent, authRoles.support_supervisor]) {
      for (const power of everyUserPower) {
        expect(role.authorize({ user: [power] }).success).toBe(false);
      }
      expect(role.authorize({ session: ['list'] }).success).toBe(false);
    }
  });

  test('o admin entra como aluna, mas não na conta de alguém da equipe', () => {
    expect(authRoles.admin.authorize({ user: ['impersonate'] }).success).toBe(true);
    expect(authRoles.admin.authorize({ user: ['impersonate-admins'] }).success).toBe(false);
  });

  test('todo cargo da equipe é protegido como alvo e está definido nos papéis', () => {
    expect(AUTH_ADMIN_ROLES.toSorted()).toEqual(['admin', 'support_agent', 'support_supervisor']);
    for (const role of AUTH_ADMIN_ROLES) expect(Object.keys(authRoles)).toContain(role);
  });

  test('toda rota HTTP do plugin fica desligada', () => {
    const plugin = admin({ roles: authRoles, adminRoles: AUTH_ADMIN_ROLES });
    const paths = Object.values(plugin.endpoints).map((endpoint) => endpoint.path);
    expect(paths.length).toBeGreaterThan(0);
    expect(ADMIN_PLUGIN_PATHS.toSorted()).toEqual(paths.toSorted());
  });
});
