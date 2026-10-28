/**
 * Cargos da equipe de suporte e o que cada um pode fazer. O Better Auth guarda as funções da
 * conta separadas por vírgula (`user.role`), então uma pessoa pode ser, por exemplo, atendente e
 * aluna de um produto ao mesmo tempo. A interface só esconde o que o cargo não usa: quem decide é
 * o servidor, sempre por `hasStaffPermission`.
 */

export const STAFF_ROLES = ['support_agent', 'support_supervisor', 'admin'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_PERMISSIONS = [
  'support.answer',
  'support.triage',
  'support.assign_others',
  'support.ombudsman',
  'support.metrics',
  'support.settings',
  'support.impersonate',
  'team.manage',
] as const;
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

const PERMISSIONS_BY_ROLE: Readonly<Record<StaffRole, ReadonlySet<StaffPermission>>> = {
  support_agent: new Set(['support.answer', 'support.triage']),
  support_supervisor: new Set([
    'support.answer',
    'support.triage',
    'support.assign_others',
    'support.ombudsman',
    'support.metrics',
  ]),
  admin: new Set(STAFF_PERMISSIONS),
};

export const STAFF_ROLE_LABELS: Readonly<Record<StaffRole, string>> = {
  support_agent: 'Atendente',
  support_supervisor: 'Supervisor',
  admin: 'Administrador',
};

export const STAFF_ROLE_DESCRIPTIONS: Readonly<Record<StaffRole, string>> = {
  support_agent: 'Responde e organiza chamados.',
  support_supervisor: 'Também distribui chamados, cuida da Ouvidoria e vê o desempenho do suporte.',
  admin: 'Faz tudo, inclusive cuidar das contas das alunas e das configurações.',
};

function rolesOf(role: string | null | undefined): string[] {
  if (!role) return [];
  return role
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isStaffRoleName(value: string): value is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(value);
}

/** Os cargos de equipe da conta, do mais alto pro mais baixo. */
export function staffRolesOf(role: string | null | undefined): StaffRole[] {
  const found = rolesOf(role).filter(isStaffRoleName);
  return STAFF_ROLES.toReversed().filter((item) => found.includes(item));
}

/** O cargo mais alto da conta na equipe, ou `null` se não é da equipe. */
export function staffRoleOf(role: string | null | undefined): StaffRole | null {
  return staffRolesOf(role)[0] ?? null;
}

export function isStaffRole(role: string | null | undefined): boolean {
  return staffRoleOf(role) !== null;
}

export function hasStaffPermission(
  role: string | null | undefined,
  permission: StaffPermission,
): boolean {
  return staffRolesOf(role).some((item) => PERMISSIONS_BY_ROLE[item].has(permission));
}

export function staffRoleLabel(role: string | null | undefined): string | null {
  const staffRole = staffRoleOf(role);
  if (!staffRole) return null;
  return STAFF_ROLE_LABELS[staffRole];
}

/** O atalho pro painel no menu da conta: aonde leva e o cargo que aparece embaixo. */
export type StaffPanelLink = { href: string; label: string; roleLabel: string };

/**
 * O atalho da equipe no menu da conta, pelo cargo mais alto: o administrador entra na visão geral
 * do painel; atendente e supervisor, direto nos chamados (a visão geral é só do administrador).
 * Quem não é da equipe não tem atalho.
 */
export function staffPanelLinkOf(role: string | null | undefined): StaffPanelLink | null {
  const staffRole = staffRoleOf(role);
  if (!staffRole) return null;
  const roleLabel = STAFF_ROLE_LABELS[staffRole];
  if (staffRole === 'admin') return { href: '/admin', label: 'Painel administrativo', roleLabel };
  return { href: '/admin/chamados', label: 'Painel de suporte', roleLabel };
}

/**
 * Troca o cargo de equipe da conta mantendo as outras funções (ex.: `user`). `null` tira a pessoa
 * da equipe. Sem nenhuma função sobrando, volta a ser `user`.
 */
export function withStaffRole(role: string | null | undefined, next: StaffRole | null): string {
  const others = rolesOf(role).filter((item) => !isStaffRoleName(item));
  const roles = next ? [...others, next] : others;
  if (roles.length === 0) return 'user';
  return [...new Set(roles)].join(',');
}

/** A lista de donos da variável de ambiente: e-mails em minúsculas, sem vazios nem repetidos. */
export function parsePlatformOwners(raw: string | null | undefined): readonly string[] {
  if (!raw) return [];
  const emails = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.includes('@'));
  return [...new Set(emails)];
}

/**
 * Dono da plataforma: administrador com o e-mail verificado e listado na variável de ambiente. Só
 * o dono convida, muda o cargo ou bloqueia a equipe; assim um administrador não rebaixa outro.
 */
export function isPlatformOwner(
  account: { email?: string | null | undefined; emailVerified?: boolean | null | undefined; role?: string | null | undefined },
  owners: readonly string[],
): boolean {
  if (!account.email || account.emailVerified !== true) return false;
  if (!staffRolesOf(account.role).includes('admin')) return false;
  return owners.includes(account.email.trim().toLowerCase());
}
