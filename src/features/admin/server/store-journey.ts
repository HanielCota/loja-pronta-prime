import { eq } from 'drizzle-orm';
import { getBrand } from '@/features/brand/server/brand-store';
import { getOnboarding } from '@/features/loja-pronta/server/conversation';
import { getStoreOverview } from '@/features/loja-pronta/server/overview';
import { getStudentProducts } from '@/features/products/server/access';
import { db } from '@/server/db';
import { user } from '@/server/db/schema';
import { requireAdmin } from './access';

/** Read saved journey data only; product visit tracking and student actions are never called. */
export async function getAccountStoreJourney(id: string) {
  const session = await requireAdmin(`/admin/contas/${encodeURIComponent(id)}/journey`);
  const account = await db.query.user.findFirst({
    columns: { id: true, name: true, email: true, banned: true },
    where: eq(user.id, id),
  });
  if (!account) return null;

  const [overview, onboarding, brand, { products }] = await Promise.all([
    getStoreOverview(id),
    getOnboarding(id),
    getBrand(id),
    getStudentProducts(id),
  ]);
  return {
    session,
    account,
    overview,
    onboarding,
    brand,
    hasAccess: products.includes('loja-pronta'),
  };
}
