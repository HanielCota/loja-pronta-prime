import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getActiveSession, needsFirstPassword } from '@/features/auth/server/session';
import { getOnboarding } from '@/features/loja-pronta/server/conversation';
import { getStorePhase } from '@/features/loja-pronta/server/store';
import { getStudentProducts, requireProduct } from '@/features/products/server/access';
import { db } from '@/server/db';
import { storeBrand } from '@/server/db/schema';
import { logoConfigSchema } from '../logo/config';
import type { BrandDraft } from '../steps';

export type Brand = BrandDraft & { completedAt: Date | null };

const EMPTY: Brand = { name: null, logo: null, description: null, completedAt: null };

/** A marca como está (sem linha: nada escolhido ainda). Logo que não vale mais conta como sem logo. */
export async function getBrand(userId: string): Promise<Brand> {
  const [row] = await db
    .select({
      name: storeBrand.name,
      logo: storeBrand.logo,
      description: storeBrand.description,
      completedAt: storeBrand.completedAt,
    })
    .from(storeBrand)
    .where(eq(storeBrand.userId, userId));
  if (!row) return EMPTY;
  const logo = logoConfigSchema.safeParse(row.logo);
  return { ...row, logo: logo.success ? logo.data : null };
}

/**
 * A vez da marca: conversa enviada e loja ainda na fase 2 (ou na 1, com a conversa enviada: é a
 * fase 2 que ela vê, ver displayedPhase), com a marca ainda não confirmada.
 */
function isBrandTurn(storePhase: number, conversationSent: boolean, brand: Brand): boolean {
  return conversationSent && storePhase <= 2 && !brand.completedAt;
}

/** Páginas da marca: fora da vez dela, levam de volta pra área da Loja Pronta. */
export async function requireBrandStudio(path: string) {
  const student = await requireProduct('loja-pronta', path);
  const userId = student.session.user.id;
  const [onboarding, phase, brand] = await Promise.all([
    getOnboarding(userId),
    getStorePhase(userId),
    getBrand(userId),
  ]);
  if (!isBrandTurn(phase, Boolean(onboarding.completedAt), brand)) redirect('/loja-pronta');
  return { student, answers: onboarding.answers, brand };
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
  if (
    !products.includes('loja-pronta') ||
    !isBrandTurn(phase, Boolean(onboarding.completedAt), brand)
  ) {
    redirect('/loja-pronta');
  }
  return { userId, studentName: session.user.name, answers: onboarding.answers, brand };
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
