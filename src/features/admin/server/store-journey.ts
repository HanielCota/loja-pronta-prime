import { eq } from 'drizzle-orm';
import { getBrand } from '@/features/brand/server/brand-store';
import { getLogoStudio } from '@/features/brand/logo-studio/server/studio-store';
import { getOnboarding } from '@/features/loja-pronta/server/conversation';
import { getStoreOverview } from '@/features/loja-pronta/server/overview';
import { getStudentProducts } from '@/features/products/server/access';
import { db } from '@/server/db';
import { user } from '@/server/db/schema';
import { requireAdmin } from './access';
import type { StoreJourneyImage } from '../store-journey';

/** Read saved journey data only; product visit tracking and student actions are never called. */
export async function getAccountStoreJourney(id: string) {
  const session = await requireAdmin(`/admin/contas/${encodeURIComponent(id)}/journey`);
  const account = await db.query.user.findFirst({
    columns: { id: true, name: true, email: true, banned: true },
    where: eq(user.id, id),
  });
  if (!account) return null;

  const [overview, onboarding, brand, { products }, studio] = await Promise.all([
    getStoreOverview(id),
    getOnboarding(id),
    getBrand(id),
    getStudentProducts(id),
    getLogoStudio(id),
  ]);
  const path = `/admin/contas/${encodeURIComponent(id)}/journey`;
  const images: StoreJourneyImage[] = studio.logos.map((logo, index) => ({
    src: `${path}/images/${index}`,
    selected: logo.key === brand.logoImage,
    uploaded: Boolean(logo.uploaded),
  }));
  // Older selected logos may predate the studio's saved image list.
  if (brand.logoImage && !images.some((image) => image.selected)) {
    images.unshift({ src: `${path}/logo`, selected: true });
  }
  return {
    session,
    account,
    overview,
    onboarding,
    brand,
    images,
    hasAccess: products.includes('loja-pronta'),
  };
}
