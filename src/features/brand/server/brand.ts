import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getActiveSession, needsFirstPassword } from '@/features/auth/server/session';
import { canReviseDonePhases } from '@/features/loja-pronta/editing';
import { getOnboarding } from '@/features/loja-pronta/server/conversation';
import { getStorePhase } from '@/features/loja-pronta/server/store';
import { getStudentProducts, requireProduct } from '@/features/products/server/access';
import { db } from '@/server/db';
import { storeBrand } from '@/server/db/schema';
import { logoConfigSchema } from '../logo/config';
import { logoSceneSchema, logoVariationsSchema, type LogoScene } from '../logo/scene';
import type { BrandDraft } from '../steps';

/**
 * `logoScene`: o logo do editor livre, quando ela usou (vale no lugar do `logo`). `updatedAt`:
 * muda a cada escolha salva, pra imagem do logo salvo não vir velha do cache.
 */
export type Brand = BrandDraft & {
  logoScene: LogoScene | null;
  /** As outras versões do editor livre (sem nenhuma: lista vazia). */
  logoVariations: LogoScene[];
  completedAt: Date | null;
  updatedAt: Date | null;
};

const EMPTY: Brand = {
  name: null,
  logo: null,
  logoScene: null,
  logoVariations: [],
  description: null,
  completedAt: null,
  updatedAt: null,
};

/**
 * A marca como está (sem linha: nada escolhido ainda). Logo (ou cena) que não vale mais conta como
 * sem logo; cena sem modelo embaixo não vale.
 */
export async function getBrand(userId: string): Promise<Brand> {
  const [row] = await db
    .select({
      name: storeBrand.name,
      logo: storeBrand.logo,
      logoScene: storeBrand.logoScene,
      logoVariations: storeBrand.logoVariations,
      description: storeBrand.description,
      completedAt: storeBrand.completedAt,
      updatedAt: storeBrand.updatedAt,
    })
    .from(storeBrand)
    .where(eq(storeBrand.userId, userId));
  if (!row) return EMPTY;
  const logo = logoConfigSchema.safeParse(row.logo);
  const scene = logoSceneSchema.safeParse(row.logoScene);
  const variations = logoVariationsSchema.safeParse(row.logoVariations);
  return {
    ...row,
    logo: logo.success ? logo.data : null,
    logoScene: logo.success && scene.success ? scene.data : null,
    logoVariations: logo.success && variations.success ? variations.data : [],
  };
}

/**
 * A vez da marca: conversa enviada e loja ainda na fase 2 (ou na 1, com a conversa enviada: é a
 * fase 2 que ela vê, ver displayedPhase), com a marca ainda não confirmada.
 */
function isBrandTurn(storePhase: number, conversationSent: boolean, brand: Brand): boolean {
  return conversationSent && storePhase <= 2 && !brand.completedAt;
}

/**
 * Como ela pode abrir a marca: criando (na vez dela) ou revendo (já confirmada, antes da
 * publicação: cada mudança fica salva, sem voltar de fase). Fora disso, nada.
 */
function brandAccess(storePhase: number, conversationSent: boolean, brand: Brand) {
  if (isBrandTurn(storePhase, conversationSent, brand)) return 'creating';
  if (conversationSent && brand.completedAt && canReviseDonePhases(storePhase)) return 'revising';
  return null;
}

/** Páginas da marca: sem poder criar nem rever, levam de volta pra área da Loja Pronta. */
export async function requireBrandStudio(path: string) {
  const student = await requireProduct('loja-pronta', path);
  const userId = student.session.user.id;
  const [onboarding, phase, brand] = await Promise.all([
    getOnboarding(userId),
    getStorePhase(userId),
    getBrand(userId),
  ]);
  const access = brandAccess(phase, Boolean(onboarding.completedAt), brand);
  if (!access) redirect('/loja-pronta');
  return { student, answers: onboarding.answers, brand, revising: access === 'revising' };
}

/** Mesma regra, pras Server Actions (que podem ser chamadas direto). */
export async function requireBrandAction() {
  const session = await getActiveSession();
  if (!session || needsFirstPassword(session.user)) redirect('/entrar');
  const userId = session.user.id;
  const [{ products }, onboarding, phase, brand] = await Promise.all([
    getStudentProducts(userId),
    getOnboarding(userId),
    getStorePhase(userId),
    getBrand(userId),
  ]);
  const access = brandAccess(phase, Boolean(onboarding.completedAt), brand);
  if (!products.includes('loja-pronta') || !access) redirect('/loja-pronta');
  return {
    userId,
    studentName: session.user.name,
    answers: onboarding.answers,
    brand,
    revising: access === 'revising',
  };
}

/**
 * Imagens do logo (prévia e arquivo): só a dona, com a Loja Pronta, em qualquer fase depois da
 * conversa. Sem acesso: nada (a rota responde 404, sem redirecionar uma imagem).
 */
export async function getOwnBrandForImage() {
  const session = await getActiveSession();
  if (!session || needsFirstPassword(session.user)) return null;
  const userId = session.user.id;
  const [{ products }, onboarding, brand] = await Promise.all([
    getStudentProducts(userId),
    getOnboarding(userId),
    getBrand(userId),
  ]);
  if (!products.includes('loja-pronta') || !onboarding.completedAt) return null;
  return { answers: onboarding.answers, brand };
}
