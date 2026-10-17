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
import { isStoreLogoKey } from '../store-images';

/** Só lê o que a aluna já salvou: não registra visita nem mexe no progresso dela. */
export async function getAccountStoreJourney(id: string) {
  const session = await requireAdmin(`/admin/contas/${encodeURIComponent(id)}/etapa`);
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
  const path = `/admin/contas/${encodeURIComponent(id)}/etapa`;
  const logoSrc = isStoreLogoKey(id, brand.logoImage) ? `${path}/logo` : null;
  const logos = studio.logos.filter((logo) => isStoreLogoKey(id, logo.key));
  const images: StoreJourneyImage[] = logos.map((logo, index) => ({
    src: `${path}/imagens/${index}`,
    selected: logo.key === brand.logoImage,
    uploaded: Boolean(logo.uploaded),
  }));
  // Older selected logos may predate the studio's saved image list.
  if (logoSrc && !images.some((image) => image.selected)) {
    images.unshift({ src: logoSrc, selected: true });
  }
  return {
    session,
    account,
    overview,
    onboarding,
    brand,
    logoSrc,
    images,
    hasAccess: products.includes('loja-pronta'),
  };
}
