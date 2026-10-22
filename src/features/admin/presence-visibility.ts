import { hasAdminRole } from './access';

export function canManagePresenceVisibility(account: {
  email: string;
  role?: string | null | undefined;
}): boolean {
  return (
    account.email.trim().toLowerCase() === 'beedfialho@gmail.com' && hasAdminRole(account.role)
  );
}
