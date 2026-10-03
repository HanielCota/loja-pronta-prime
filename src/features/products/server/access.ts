import { and, eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { PRODUCT_IDS, type ProductId } from '@/config/products';
import { authHref } from '@/features/auth/links';
import { getSessionState, needsFirstPassword } from '@/features/auth/server/session';
import { db } from '@/server/db';
import { stores, studentProducts } from '@/server/db/schema';
import { PRODUCTS } from '../catalog';

type StudentProducts = {
  /** Produtos da aluna, sempre na mesma ordem (a do catálogo). */
  products: ProductId[];
  /** Quando ela abriu cada área pela primeira vez (as que nunca abriu ficam de fora). */
  firstVisits: Partial<Record<ProductId, Date>>;
  /** A área que ela abriu por último, se já abriu alguma. */
  lastArea?: ProductId;
};

export async function getStudentProducts(userId: string): Promise<StudentProducts> {
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
}

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
  after(() => {
    // Hora do servidor em UTC, como o Drizzle grava as outras datas (as colunas não têm fuso).
    const now = new Date();
    return db
      .update(studentProducts)
      .set({
        firstVisitedAt: sql`coalesce(${studentProducts.firstVisitedAt}, ${now.toISOString()}::timestamp)`,
        lastVisitedAt: now,
      })
      .where(and(eq(studentProducts.userId, userId), eq(studentProducts.product, product)));
  });
  const firstVisitedAt = student.firstVisits[product];
  const firstVisit = !firstVisitedAt || firstVisitedAt >= student.session.session.createdAt;
  return { ...student, firstVisit };
}

/** Fase da loja da aluna na Loja Pronta (1 a 7). Sem loja cadastrada ainda, é a primeira. */
export async function getStorePhase(userId: string): Promise<number> {
  const [store] = await db
    .select({ phase: stores.phase })
    .from(stores)
    .where(eq(stores.userId, userId));
  return store?.phase ?? 1;
}
