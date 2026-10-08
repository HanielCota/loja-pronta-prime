import { revalidateTag } from 'next/cache';

export const ADMIN_OVERVIEW_TAG = 'admin-overview';

/** Os números podem esperar até 60s; mudanças feitas no painel aparecem na hora. */
export function revalidateAdminOverview() {
  revalidateTag(ADMIN_OVERVIEW_TAG, { expire: 0 });
}
