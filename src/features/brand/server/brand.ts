import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getActiveSession, needsFirstPassword } from '@/features/auth/server/session';
import { canReviseDonePhases } from '@/features/loja-pronta/editing';
import { getOnboarding } from '@/features/loja-pronta/server/conversation';
import { getStorePhase } from '@/features/loja-pronta/server/store';
import { getStudentProducts, requireProduct } from '@/features/products/server/access';
import { db } from '@/server/db';
import { storeBrand } from '@/server/db/schema';
import { brandStepPath, type BrandDraft } from '../steps';

/** `updatedAt`: muda a cada escolha salva, pra imagem do logo salvo não vir velha do cache. */
export type Brand = BrandDraft & {
  completedAt: Date | null;
  updatedAt: Date | null;
};

const EMPTY: Brand = {
  name: null,
  logoImage: null,
  description: null,
  completedAt: null,
  updatedAt: null,
};

/** A marca como está (sem linha: nada escolhido ainda). */
export async function getBrand(userId: string): Promise<Brand> {
  const [row] = await db
    .select({
      name: storeBrand.name,
      logoImage: storeBrand.logoImage,
      description: storeBrand.description,
      completedAt: storeBrand.completedAt,
      updatedAt: storeBrand.updatedAt,
    })
    .from(storeBrand)
    .where(eq(storeBrand.userId, userId));
  return row ?? EMPTY;
}

/**
 * O logo escolhido no chat (a chave da imagem dela). Fica aqui, fora das Server Actions: quem
 * chama já conferiu o acesso e que a imagem é dela (ver logo-chat/server/actions).
 */
export async function setBrandLogo(userId: string, logoImage: string) {
  await db
    .insert(storeBrand)
    .values({ userId, logoImage })
    .onConflictDoUpdate({ target: storeBrand.userId, set: { logoImage } });
}

/**
 * A vez da marca: conversa enviada e loja ainda na fase 2 (ou na 1, com a conversa enviada: é a
 * fase 2 que ela vê, ver displayedPhase), com a marca ainda não confirmada.
 */
function isBrandTurn(storePhase: number, conversationSent: boolean, brand: Brand): boolean {
  return conversationSent && storePhase <= 2 && !brand.completedAt;
}

/**
 * Como ela pode abrir a marca: criando (na vez dela), revendo (já confirmada, antes da
 * publicação: cada mudança fica salva, sem voltar de fase) ou só o logo (marca confirmada antes
 * do chat do logo, que ficou sem imagem quando o logo antigo saiu: em qualquer fase, ela cria o
 * logo de novo, e só ele). Fora disso, nada.
 */
type BrandAccess = 'creating' | 'revising' | 'logo-only';

function brandAccess(
  storePhase: number,
  conversationSent: boolean,
  brand: Brand,
): BrandAccess | null {
  if (isBrandTurn(storePhase, conversationSent, brand)) return 'creating';
  if (conversationSent && brand.completedAt && canReviseDonePhases(storePhase)) return 'revising';
  if (conversationSent && brand.completedAt && !brand.logoImage) return 'logo-only';
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
  if (access === 'logo-only' && path !== brandStepPath('logo')) redirect(brandStepPath('logo'));
  return {
    student,
    answers: onboarding.answers,
    brand,
    // Só o logo também é rever: escolher volta pro painel, não pros outros passos.
    revising: access !== 'creating',
    logoOnly: access === 'logo-only',
  };
}

/**
 * Mesma regra, pras Server Actions (que podem ser chamadas direto). `logo`: a action é do chat do
 * logo (a única que vale no acesso "só o logo").
 */
export async function requireBrandAction({ logo = false }: { logo?: boolean } = {}) {
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
  if (access === 'logo-only' && !logo) redirect('/loja-pronta');
  return {
    userId,
    studentName: session.user.name,
    answers: onboarding.answers,
    brand,
    revising: access !== 'creating',
    logoOnly: access === 'logo-only',
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
  return { userId, brand };
}
