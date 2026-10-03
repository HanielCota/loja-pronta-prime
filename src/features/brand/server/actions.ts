'use server';

import { and, eq, isNull, lte } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { storeBrand, stores } from '@/server/db/schema';
import { parseBrandDescription, parseBrandName } from '../fields';
import { logoTemplates, type LogoConfig } from '../logo/config';
import { logoSceneSchema, logoVariationsSchema, type LogoScene } from '../logo/scene';
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

/**
 * O nome da loja. Na primeira vez, o logo já começa do primeiro modelo (com a letra, a cor e o
 * desenho da conversa): ela segue direto pro editor, sem passo de escolher um modelo.
 */
export async function saveBrandName(_state: BrandResult, formData: FormData): Promise<BrandResult> {
  const { userId, answers, brand, revising } = await requireBrandAction();
  const parsed = parseBrandName(formData.get('name'));
  if (!parsed.ok) return { error: parsed.error };
  const starter = brand.logo ? {} : { logo: logoTemplates(answers)[0] };
  await saveBrand(userId, { name: parsed.value, ...starter });
  after(formData, revising, 'ajustar');
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

/** Lê e confere um JSON que o editor manda (a cena ou as variações). Inválido: nada. */
function parseJson<T>(
  value: unknown,
  schema: { safeParse: (input: unknown) => { success: boolean; data?: T } },
) {
  if (typeof value !== 'string' || value.length > 600_000) return undefined;
  try {
    const parsed = schema.safeParse(JSON.parse(value));
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
async function saveScene(
  userId: string,
  scene: LogoScene,
  variations: LogoScene[],
  base: LogoConfig | undefined,
) {
  await db
    .update(storeBrand)
    // Sem modelo ainda (marca começada antes do passo de modelos sair): o primeiro vai junto.
    .set({ logoScene: scene, logoVariations: variations, ...(base ? { logo: base } : {}) })
    .where(eq(storeBrand.userId, userId));
}

/**
 * Salvamento automático do editor, a cada mudança (sem sair da tela).
 */
export async function saveLogoScene(scene: string, variations: string): Promise<BrandResult> {
  const { userId, answers, brand } = await requireBrandAction();
  const parsed = parseJson(scene, logoSceneSchema);
  const others = parseJson(variations, logoVariationsSchema);
  if (!parsed || !others) return { error: SCENE_ERROR };
  await saveScene(userId, parsed, others, brand.logo ? undefined : logoTemplates(answers)[0]);
  return undefined;
}

/** "Salvar e continuar" do editor livre: grava a cena como está e segue (ou volta pra revisão). */
export async function finishLogoEditor(
  _state: BrandResult,
  formData: FormData,
): Promise<BrandResult> {
  const { userId, answers, brand, revising } = await requireBrandAction();
  const parsed = parseJson(formData.get('scene'), logoSceneSchema);
  const others = parseJson(formData.get('variations'), logoVariationsSchema);
  if (!parsed || !others) return { error: SCENE_ERROR };
  await saveScene(userId, parsed, others, brand.logo ? undefined : logoTemplates(answers)[0]);
  after(formData, revising, 'descricao');
}

/** Confirma a marca: a loja passa pra fase 3 (abrir a conta na Shopee). */
export async function finishBrand(): Promise<BrandResult> {
  const { userId, brand, revising } = await requireBrandAction();
  // Revendo, a marca já foi confirmada e cada mudança já está salva: só volta pro painel.
  if (revising) redirect('/loja-pronta');
  if (!brand.name || !brand.logo || !brand.description) {
    redirect(brandStepPath(!brand.name ? 'nome' : !brand.logo ? 'ajustar' : 'descricao'));
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
