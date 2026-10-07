import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { after } from 'next/server';
import { PRODUCT_IDS, type ProductId } from '@/config/products';
import { authHref } from '@/features/auth/links';
import {
  getActiveSession,
  getSessionState,
  needsFirstPassword,
} from '@/features/auth/server/session';
import { db } from '@/server/db';
import { studentProducts } from '@/server/db/schema';
import { PRODUCTS } from '../catalog';

type StudentProducts = {
  /** Produtos da aluna, sempre na mesma ordem (a do catálogo). */
  products: ProductId[];
  /** Quando ela abriu cada área pela primeira vez (as que nunca abriu ficam de fora). */
  firstVisits: Partial<Record<ProductId, Date>>;
  /** A área que ela abriu por último, se já abriu alguma. */
  lastArea?: ProductId | undefined;
};

/** Os produtos dela (lidos uma vez por requisição, mesmo com várias guardas pedindo). */
export const getStudentProducts = cache(async (userId: string): Promise<StudentProducts> => {
  const rows = await db
    .select({
      product: studentProducts.product,
      firstVisitedAt: studentProducts.firstVisitedAt,
      lastVisitedAt: studentProducts.lastVisitedAt,
    })
    .from(studentProducts)
    .where(eq(studentProducts.userId, userId));

  const visits = rows.filter((row) => row.lastVisitedAt !== null);
  const latest = visits.toSorted((a, b) => Number(b.lastVisitedAt) - Number(a.lastVisitedAt))[0];
  return {
    products: PRODUCT_IDS.filter((id) => rows.some((row) => row.product === id)),
    firstVisits: Object.fromEntries(
      rows.flatMap((row) => (row.firstVisitedAt ? [[row.product, row.firstVisitedAt]] : [])),
    ),
    lastArea: latest?.product,
  };
});

/**
 * Páginas da área da aluna: exige estar dentro e já ter criado a própria senha. Sem sessão, vai
 * pro login (e volta pra cá depois); com a senha temporária, pro primeiro acesso.
 */
export async function requireStudent(path: string) {
  const state = await getSessionState();
  const next = path === '/' ? undefined : path;
  // Bloqueada com a sessão aberta (reembolso, cancelamento): o login explica o motivo.
  if (state.status === 'banned') redirect('/entrar?motivo=conta-desativada');
  if (state.status === 'none') redirect(authHref('/entrar', next));
  const { session } = state;
  if (needsFirstPassword(session.user)) redirect(authHref('/primeiro-acesso', next));
  return { session, ...(await getStudentProducts(session.user.id)) };
}

/** De quanto em quanto tempo a visita a uma área é gravada de novo. */
const VISIT_INTERVAL_MS = 10 * 60 * 1000;

/** Menu e conteúdo conferem o mesmo produto: registra a visita uma vez por renderização. */
const recordProductVisit = cache((userId: string, product: ProductId) => {
  after(() => {
    const now = new Date();
    const recent = new Date(now.getTime() - VISIT_INTERVAL_MS);
    return db
      .update(studentProducts)
      .set({
        firstVisitedAt: sql`coalesce(${studentProducts.firstVisitedAt}, ${now.toISOString()}::timestamp)`,
        lastVisitedAt: now,
      })
      .where(
        and(
          eq(studentProducts.userId, userId),
          eq(studentProducts.product, product),
          or(isNull(studentProducts.lastVisitedAt), lt(studentProducts.lastVisitedAt, recent)),
        ),
      );
  });
});

/**
 * Área de um produto: quem não tem esse produto volta pro início (que mostra o que ela tem).
 * `path` é a página atual (pra onde o login devolve), quando é uma página dentro da área.
 * Registra a visita depois de responder (não atrasa a página). `firstVisit` vale durante toda a
 * sessão em que ela abriu a área pela primeira vez: a página pode ser renderizada de novo logo em
 * seguida, e a saudação não pode trocar no meio da primeira visita.
 */
export async function requireProduct(product: ProductId, path: string = PRODUCTS[product].path) {
  const student = await requireStudent(path);
  if (!student.products.includes(product)) redirect('/');

  const userId = student.session.user.id;
  recordProductVisit(userId, product);
  const firstVisitedAt = student.firstVisits[product];
  const firstVisit = !firstVisitedAt || firstVisitedAt >= student.session.session.createdAt;
  return { ...student, firstVisit };
}

/**
 * A mesma regra, pras Server Actions (que podem ser chamadas direto, sem passar pela página):
 * sessão ativa, senha própria criada e o produto. Sem isso, nada: leva pro login ou pro início.
 */
export async function requireProductAction(product: ProductId) {
  const session = await getActiveSession();
  if (!session || needsFirstPassword(session.user)) redirect('/entrar');
  const userId = session.user.id;
  const { products } = await getStudentProducts(userId);
  if (!products.includes(product)) redirect('/');
  return { session, userId };
}
