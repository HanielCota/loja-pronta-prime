/**
 * Ainda está com a senha temporária? A marca nasce `true`; `null` (contas antigas, sem a
 * marca) conta como temporária, pelo lado seguro. Único lugar com essa regra.
 */
export function needsFirstPassword(user: { mustChangePassword?: boolean | null }): boolean {
  return user.mustChangePassword !== false;
}
