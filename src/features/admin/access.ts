/** O Better Auth guarda uma ou mais funções separadas por vírgula. */
export function hasAdminRole(role: string | null | undefined): boolean {
  return role?.split(',').some((item) => item.trim() === 'admin') ?? false;
}

/**
 * Aluna é quem tem só a função `user` ou nenhuma. Outras funções (admin ou personalizadas) ficam
 * de fora de ações administrativas reservadas à recuperação de contas de aluna.
 */
export function isStudentRole(role: string | null | undefined): boolean {
  return (role ?? 'user') === 'user';
}
