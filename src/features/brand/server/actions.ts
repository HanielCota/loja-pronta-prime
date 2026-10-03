'use server';

import { and, eq, isNull, lte } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { storeBrand, stores } from '@/server/db/schema';
import { parseBrandDescription, parseBrandName } from '../fields';
import { logoConfigSchema, logoTemplates } from '../logo/config';
import { BRAND_DONE_PATH, brandStepPath } from '../steps';
import { requireBrandAction } from './brand';

/** Resposta pra tela quando algo não passa (sem erro, a action redireciona). */
export type BrandResult = { error?: string } | undefined;

type BrandPatch = Partial<Pick<typeof storeBrand.$inferInsert, 'name' | 'logo' | 'description'>>;

/** Grava só o que mudou, criando a linha na primeira escolha. Confirmada, não muda mais. */
async function saveBrand(userId: string, patch: BrandPatch) {
  await db
    .insert(storeBrand)
    .values({ userId, ...patch })
    .onConflictDoUpdate({
      target: storeBrand.userId,
      set: patch,
      setWhere: isNull(storeBrand.completedAt),
    });
}

/** Volta pra revisão quando ela veio de lá pra mudar algo; senão, segue pro próximo passo. */
function after(formData: FormData, next: Parameters<typeof brandStepPath>[0]): never {
  redirect(brandStepPath(formData.get('editing') ? 'revisao' : next));
}

export async function saveBrandName(_state: BrandResult, formData: FormData): Promise<BrandResult> {
  const { userId } = await requireBrandAction();
  const parsed = parseBrandName(formData.get('name'));
  if (!parsed.ok) return { error: parsed.error };
  await saveBrand(userId, { name: parsed.value });
  after(formData, 'modelo');
}

/** Escolheu um dos modelos prontos: o logo começa dele, e ela segue pro estúdio. */
export async function chooseLogoTemplate(
  _state: BrandResult,
  formData: FormData,
): Promise<BrandResult> {
  const { userId, answers } = await requireBrandAction();
  const index = Number(formData.get('template'));
  const template = logoTemplates(answers)[index];
  if (!template) return { error: 'Não encontramos esse modelo. Recarregue a página.' };
  await saveBrand(userId, { logo: template });
  redirect(`${brandStepPath('ajustar')}${formData.get('editing') ? '?editar=1' : ''}`);
}

/** O logo como ficou no estúdio. */
export async function saveLogo(_state: BrandResult, formData: FormData): Promise<BrandResult> {
  const { userId } = await requireBrandAction();
  const parsed = logoConfigSchema.safeParse({
    template: Number(formData.get('template')),
    layout: formData.get('layout'),
    font: formData.get('font'),
    color: formData.get('color'),
    icon: formData.get('icon') === 'nenhum' ? null : formData.get('icon'),
    background: formData.get('background'),
  });
  if (!parsed.success) return { error: 'Não conseguimos salvar o logo. Recarregue a página.' };
  await saveBrand(userId, { logo: parsed.data });
  after(formData, 'descricao');
}

export async function saveBrandDescription(
  _state: BrandResult,
  formData: FormData,
): Promise<BrandResult> {
  const { userId } = await requireBrandAction();
  const parsed = parseBrandDescription(formData.get('description'));
  if (!parsed.ok) return { error: parsed.error };
  await saveBrand(userId, { description: parsed.value });
  after(formData, 'revisao');
}

/** Confirma a marca: a loja passa pra fase 3 (abrir a conta na Shopee). */
export async function finishBrand(): Promise<BrandResult> {
  const { userId, brand } = await requireBrandAction();
  if (!brand.name || !brand.logo || !brand.description) {
    redirect(brandStepPath(!brand.name ? 'nome' : !brand.logo ? 'modelo' : 'descricao'));
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
