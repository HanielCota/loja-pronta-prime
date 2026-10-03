import { redirect } from 'next/navigation';
import { requireBrandStudio } from '@/features/brand/server/brand';
import { BRAND_PATH, brandStepPath, resumeBrandStep } from '@/features/brand/steps';

/** Entrada da marca: leva pra onde ela parou (revendo a marca confirmada, pra revisão). */
export default async function BrandPage() {
  const { brand, revising } = await requireBrandStudio(BRAND_PATH);
  redirect(brandStepPath(revising ? 'revisao' : resumeBrandStep(brand)));
}
