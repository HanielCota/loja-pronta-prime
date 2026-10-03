'use server';

import { and, eq, isNull, lte } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { storeBrand, stores } from '@/server/db/schema';
import { parseBrandDescription, parseBrandName } from '../fields';
import { logoConfigSchema, logoTemplates } from '../logo/config';
import { logoSceneSchema, type LogoScene } from '../logo/scene';
import { BRAND_DONE_PATH, brandStepPath } from '../steps';
import { requireBrandAction } from './brand';

/** Resposta pra tela quando algo não passa (sem erro, a action redireciona). */
export type BrandResult = { error?: string } | undefined;

type BrandPatch = Partial<
  Pick<typeof storeBrand.$inferInsert, 'name' | 'logo' | 'logoScene' | 'description'>
>;

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

export async function saveBrandName(_state: BrandResult, formData: FormData): Promise<BrandResult> {
  const { userId, revising } = await requireBrandAction();
  const parsed = parseBrandName(formData.get('name'));
  if (!parsed.ok) return { error: parsed.error };
  await saveBrand(userId, { name: parsed.value });
  after(formData, revising, 'modelo');
}

/** Escolheu um dos modelos prontos: o logo começa dele, e ela segue pro estúdio. */
export async function chooseLogoTemplate(
  _state: BrandResult,
  formData: FormData,
): Promise<BrandResult> {
  const { userId, answers, revising } = await requireBrandAction();
  const index = Number(formData.get('template'));
  const template = logoTemplates(answers)[index];
  if (!template) return { error: 'Não encontramos esse modelo. Recarregue a página.' };
  // Modelo novo: o que ela montou no editor livre era em cima do outro, e sai.
  await saveBrand(userId, { logo: template, logoScene: null });
  redirect(`${brandStepPath('ajustar')}${formData.get('editing') || revising ? '?editar=1' : ''}`);
}

/** O logo como ficou no estúdio. */
export async function saveLogo(_state: BrandResult, formData: FormData): Promise<BrandResult> {
  const { userId, revising } = await requireBrandAction();
  const parsed = logoConfigSchema.safeParse({
    template: Number(formData.get('template')),
    layout: formData.get('layout'),
    font: formData.get('font'),
    color: formData.get('color'),
    icon: formData.get('icon') === 'nenhum' ? null : formData.get('icon'),
    background: formData.get('background'),
  });
  if (!parsed.success) return { error: 'Não conseguimos salvar o logo. Recarregue a página.' };
  // Salvo no estúdio guiado: o logo volta a ser o dele (a cena do editor livre sai).
  await saveBrand(userId, { logo: parsed.data, logoScene: null });
  after(formData, revising, 'descricao');
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

/** Lê e confere a cena que o editor manda (JSON). Inválida: nada. */
function parseScene(value: unknown) {
  if (typeof value !== 'string' || value.length > 100_000) return undefined;
  try {
    const parsed = logoSceneSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

const SCENE_ERROR = 'Não conseguimos salvar o logo. Recarregue a página.';

/**
 * Grava a cena do editor livre. Só atualiza (a linha já existe: a cena vai por cima do logo do
 * estúdio); um upsert esbarraria na regra "cena só com logo embaixo" antes de achar a linha.
 */
async function saveScene(userId: string, scene: LogoScene) {
  await db.update(storeBrand).set({ logoScene: scene }).where(eq(storeBrand.userId, userId));
}

/**
 * Salvamento automático do editor livre, a cada mudança (sem sair da tela). Só por cima de um
 * modelo: a cena precisa do logo do estúdio guiado embaixo.
 */
export async function saveLogoScene(scene: string): Promise<BrandResult> {
  const { userId, brand } = await requireBrandAction();
  const parsed = parseScene(scene);
  if (!parsed || !brand.logo) return { error: SCENE_ERROR };
  await saveScene(userId, parsed);
  return undefined;
}

/** "Salvar e continuar" do editor livre: grava a cena como está e segue (ou volta pra revisão). */
export async function finishLogoEditor(
  _state: BrandResult,
  formData: FormData,
): Promise<BrandResult> {
  const { userId, brand, revising } = await requireBrandAction();
  const parsed = parseScene(formData.get('scene'));
  if (!parsed || !brand.logo) return { error: SCENE_ERROR };
  await saveScene(userId, parsed);
  after(formData, revising, 'descricao');
}

/** Confirma a marca: a loja passa pra fase 3 (abrir a conta na Shopee). */
export async function finishBrand(): Promise<BrandResult> {
  const { userId, brand, revising } = await requireBrandAction();
  // Revendo, a marca já foi confirmada e cada mudança já está salva: só volta pro painel.
  if (revising) redirect('/loja-pronta');
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
