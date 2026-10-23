'use server';

import { and, eq, lte } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { SHOPEE_STORE } from '@/config/onboarding';
import { db } from '@/server/db';
import { storeBrand, stores } from '@/server/db/schema';
import { parseBrandDescription, parseBrandName } from '../fields';
import { BRAND_DONE_PATH, brandStepPath } from '../steps';
import { requireBrandAction } from './brand';
import { brandFingerprint } from './fingerprint';
import { saveBrand } from './brand-store';

/** Resposta pra tela quando algo não passa (sem erro, a action redireciona). */
export type BrandResult = { error?: string } | undefined;

/**
 * Volta pra revisão quando ela veio de lá pra mudar algo (ou está revendo a marca confirmada);
 * senão, segue pro próximo passo.
 */
function after(
  formData: FormData,
  revising: boolean,
  next: Parameters<typeof brandStepPath>[0],
): never {
  redirect(brandStepPath(formData.get('editing') || revising ? 'revisao' : next));
}

/**
 * O nome da loja; depois, o estúdio do logo. Trocando o nome de uma marca já feita, o texto da loja
 * troca o nome antigo pelo novo, e o logo (que traz o nome escrito na imagem) pede pra ser
 * criado de novo: ela volta pro estúdio, com um aviso. O logo de agora fica (se ela não tiver mais
 * criações, ainda dá pra seguir com ele).
 */
export async function saveBrandName(_state: BrandResult, formData: FormData): Promise<BrandResult> {
  const { userId, brand, revising } = await requireBrandAction();
  const parsed = parseBrandName(formData.get('name'));
  if (!parsed.ok) return { error: parsed.error };
  const name = parsed.value;
  const renamed = Boolean(brand.name) && brand.name !== name;
  // O texto com o nome novo, se ainda couber no limite da Shopee (senão, fica como estava).
  const description =
    renamed && brand.description
      ? parseBrandDescription(brand.description.replaceAll(brand.name!, name))
      : undefined;
  await saveBrand(userId, { name, ...(description?.ok ? { description: description.value } : {}) });
  if (renamed && brand.logoImage) {
    // O estúdio abre no resumo, com o aviso: o nome antigo vai no endereço (é só o que ela digitou).
    redirect(`${brandStepPath('logo')}?editar=1&antigo=${encodeURIComponent(brand.name!)}`);
  }
  after(formData, revising, 'logo');
}

export async function saveBrandDescription(
  _state: BrandResult,
  formData: FormData,
): Promise<BrandResult> {
  const { userId, revising } = await requireBrandAction();
  const parsed = parseBrandDescription(formData.get('description'));
  if (!parsed.ok) return { error: parsed.error };
  await saveBrand(userId, { description: parsed.value });
  after(formData, revising, 'revisao');
}

/**
 * Confirma a marca: a loja passa pra fase 3 (abrir a conta na Shopee) ou, pra quem já tem loja
 * na Shopee (respondeu na conversa), direto pra 4 (conectar a loja).
 */
export async function finishBrand(_state: BrandResult, formData: FormData): Promise<BrandResult> {
  const { userId, brand, revising, answers } = await requireBrandAction();

  if (!brand.name || !brand.logoImage || !brand.description) {
    redirect(brandStepPath(!brand.name ? 'nome' : !brand.logoImage ? 'logo' : 'descricao'));
  }
  if (formData.get('fingerprint') !== brandFingerprint(brand))
    return { error: 'Sua marca mudou em outra página. Atualize a revisão antes de confirmar.' };
  const next = answers.vendas === SHOPEE_STORE ? 4 : 3;
  const confirmed = await db.transaction(async (tx) => {
    const [approved] = await tx
      .update(storeBrand)
      .set({
        completedAt: brand.completedAt ?? new Date(),
        publicationFingerprint: brandFingerprint(brand),
      })
      .where(
        and(
          eq(storeBrand.userId, userId),
          eq(storeBrand.name, brand.name!),
          eq(storeBrand.description, brand.description!),
          eq(storeBrand.logoImage, brand.logoImage!),
        ),
      )
      .returning({ userId: storeBrand.userId });
    if (!approved) return false;
    // Só avança quem está na fase da marca (a 1 conta: a conversa enviada já é a fase 2).
    await tx
      .insert(stores)
      .values({ userId, phase: next })
      .onConflictDoUpdate({
        target: stores.userId,
        set: { phase: next },
        setWhere: lte(stores.phase, 2),
      });
    return true;
  });
  if (!confirmed) redirect(brandStepPath('revisao'));
  redirect(revising ? '/loja-pronta' : BRAND_DONE_PATH);
}
