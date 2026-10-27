import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';

/**
 * Papéis que o plugin admin do Better Auth conhece. Só `admin` recebe os poderes dele (bloquear,
 * entrar como aluna, mudar papel); os cargos do suporte entram sem poder nenhum. O que cada cargo
 * pode no suporte mora em `features/support/staff-access.ts`.
 *
 * Os cargos da equipe ficam em `adminRoles` pra o próprio plugin recusar "entrar como" numa conta
 * da equipe: o `admin` não tem `impersonate-admins`.
 */
export const authAccessControl = createAccessControl(defaultStatements);

const noAdminPowers = { user: [], session: [] };

export const authRoles = {
  user: authAccessControl.newRole(noAdminPowers),
  support_agent: authAccessControl.newRole(noAdminPowers),
  support_supervisor: authAccessControl.newRole(noAdminPowers),
  admin: authAccessControl.newRole(adminAc.statements),
};

export const AUTH_ADMIN_ROLES = ['admin', 'support_agent', 'support_supervisor'];

/**
 * Todas as rotas HTTP do plugin admin. As telas agem por Server Actions, que conferem quem pode
 * agir e registram o que foi feito; pela rota crua, um admin trocaria a senha de uma aluna ou
 * entraria na conta de alguém da equipe sem registro. As chamadas `auth.api.*` do servidor não
 * passam pelo `disabledPaths` e continuam funcionando.
 */
export const ADMIN_PLUGIN_PATHS = [
  '/admin/set-role',
  '/admin/get-user',
  '/admin/create-user',
  '/admin/update-user',
  '/admin/list-users',
  '/admin/list-user-sessions',
  '/admin/unban-user',
  '/admin/ban-user',
  '/admin/impersonate-user',
  '/admin/stop-impersonating',
  '/admin/revoke-user-session',
  '/admin/revoke-user-sessions',
  '/admin/remove-user',
  '/admin/set-user-password',
  '/admin/has-permission',
];
