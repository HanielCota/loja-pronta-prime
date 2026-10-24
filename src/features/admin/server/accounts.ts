import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { effectiveProductAccess } from '@/features/products/server/eligibility';
import { db } from '@/server/db';
import { session, studentProducts, user } from '@/server/db/schema';
import { getStoreOverview } from '@/features/loja-pronta/server/overview';
import { requireAdmin } from './access';

export const ACCOUNTS_PAGE_SIZE = 50;

/** Lista as contas mais novas primeiro; a busca procura no nome e no email. */
export async function listAccounts({ query, page }: { query: string; page: number }) {
  await requireAdmin('/admin/contas');
  // O mesmo teto da busca de leads: nome e email não passam disso.
  const term = query.trim().slice(0, 120);
  // Escapa os curingas do LIKE: "%" ou "_" digitados valem como texto.
  const pattern = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
  const where = term ? or(ilike(user.name, pattern), ilike(user.email, pattern)) : undefined;

  const [rows, [counted]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(where)
      // O id desempata contas criadas no mesmo instante (importações): sem ele, uma conta podia
      // aparecer em duas páginas e outra em nenhuma.
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(ACCOUNTS_PAGE_SIZE)
      .offset((page - 1) * ACCOUNTS_PAGE_SIZE),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(user)
      .where(where),
  ]);

  const products = rows.length
    ? await db
        .select({ userId: studentProducts.userId, product: studentProducts.product })
        .from(studentProducts)
        .where(
          and(
            effectiveProductAccess(),
            inArray(
              studentProducts.userId,
              rows.map((row) => row.id),
            ),
          ),
        )
    : [];

  return {
    total: counted?.total ?? 0,
    accounts: rows.map((row) => ({
      ...row,
      products: products.filter((item) => item.userId === row.id).map((item) => item.product),
    })),
  };
}

/** Tudo o que a tela de uma conta mostra; null quando a conta não existe. */
export async function getAccount(id: string) {
  await requireAdmin(`/admin/contas/${id}`);
  const account = await db.query.user.findFirst({ where: eq(user.id, id) });
  if (!account) return null;

  const [products, overview, [opened]] = await Promise.all([
    db
      .select()
      .from(studentProducts)
      .where(and(eq(studentProducts.userId, id), effectiveProductAccess())),
    getStoreOverview(id),
    db
      .select({ sessions: sql<number>`count(*)::int` })
      .from(session)
      .where(eq(session.userId, id)),
  ]);

  const storePhase =
    overview.phase > 1 || overview.conversation !== 'nao-comecou' ? overview.phase : null;
  return { account, products, storePhase, sessions: opened?.sessions ?? 0 };
}
