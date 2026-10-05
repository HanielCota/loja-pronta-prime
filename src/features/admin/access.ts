/** O Better Auth guarda uma ou mais funções separadas por vírgula. */
export function hasAdminRole(role: string | null | undefined): boolean {
  return role?.split(',').some((item) => item.trim() === 'admin') ?? false;
}
