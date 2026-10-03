'use server';

import { and, eq, isNull, lte } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { storeBrand, stores } from '@/server/db/schema';
import { parseBrandDescription, parseBrandName } from '../fields';
import { BRAND_DONE_PATH, brandStepPath } from '../steps';
import { requireBrandAction } from './brand';

/** Resposta pra tela quando algo não passa (sem erro, a action redireciona). */
export type BrandResult = { error?: string } | undefined;

type BrandPatch = Partial<Pick<typeof storeBrand.$inferInsert, 'name' | 'description'>>;

/**
 * Grava só o que mudou, criando a linha na primeira escolha. Confirmada, muda só revendo (a guarda
 * de cada action já decidiu que ela pode, até a publicação).
 */
async function saveBrand(userId: string, patch: BrandPatch) {
  await db
    .insert(storeBrand)
    .values({ userId, ...patch })
    .onConflictDoUpdate({ target: storeBrand.userId, set: patch });
}

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

/** O nome da loja; depois, o chat do logo. */
export async function saveBrandName(_state: BrandResult, formData: FormData): Promise<BrandResult> {
  const { userId, revising } = await requireBrandAction();
  const parsed = parseBrandName(formData.get('name'));
  if (!parsed.ok) return { error: parsed.error };
  await saveBrand(userId, { name: parsed.value });
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

/** Confirma a marca: a loja passa pra fase 3 (abrir a conta na Shopee). */
export async function finishBrand(): Promise<BrandResult> {
  const { userId, brand, revising } = await requireBrandAction();
  // Revendo, a marca já foi confirmada e cada mudança já está salva: só volta pro painel.
  if (revising) redirect('/loja-pronta');
  if (!brand.name || !brand.logoImage || !brand.description) {
    redirect(brandStepPath(!brand.name ? 'nome' : !brand.logoImage ? 'logo' : 'descricao'));
  }
  await db.transaction(async (tx) => {
    await tx
      .update(storeBrand)
      .set({ completedAt: new Date() })
      .where(and(eq(storeBrand.userId, userId), isNull(storeBrand.completedAt)));
    // Só avança quem está na fase da marca (a 1 conta: a conversa enviada já é a fase 2).
    await tx
      .insert(stores)
      .values({ userId, phase: 3 })
      .onConflictDoUpdate({
        target: stores.userId,
        set: { phase: 3 },
        setWhere: lte(stores.phase, 2),
      });
  });
  redirect(BRAND_DONE_PATH);
}
