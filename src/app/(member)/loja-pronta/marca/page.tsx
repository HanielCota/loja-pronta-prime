import { redirect } from 'next/navigation';
import { requireBrandStudio } from '@/features/brand/server/brand';
import { BRAND_PATH, brandStepPath, resumeBrandStep } from '@/features/brand/steps';

/** Entrada da marca: leva pra onde ela parou. */
export default async function BrandPage() {
  const { brand } = await requireBrandStudio(BRAND_PATH);
  redirect(brandStepPath(resumeBrandStep(brand)));
}
