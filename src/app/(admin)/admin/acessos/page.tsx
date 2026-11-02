import Link from 'next/link';
import { listUndatedManualGrants } from '@/features/admin/server/manual-access-review';
import { formatAccessDate } from '@/features/products/access-validity';
import type { Metadata } from 'next';
import { panelCard } from '@/features/member/components/area-shell';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { ProductAccessManager } from '@/features/admin/components/product-access-manager';
import { getRecentProductAccessEvents } from '@/features/admin/server/actions';
import { requireAdmin } from '@/features/admin/server/access';

export const metadata: Metadata = { title: 'Acessos das alunas · Administração' };

export default async function AdminProductAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requestedPage = Number((await searchParams).page);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100000) : 1;
  await requireAdmin('/admin/acessos');
  const [events, review] = await Promise.all([
    getRecentProductAccessEvents(),
    listUndatedManualGrants(page),
  ]);

  return (
    <AdminPage title="Acessos das alunas">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-body text-muted-foreground">
          Cada produto é controlado separadamente. Remover um não altera o outro.
        </p>
      </div>
      <section aria-labelledby="change-access" className={`${panelCard} gap-5`}>
        <div>
          <h2 className="text-title font-semibold text-foreground" id="change-access">
            Liberar ou remover um produto
          </h2>
          <p className="mt-2 text-body text-muted-foreground">
            Digite o email da conta, escolha o produto e explique o motivo.
          </p>
        </div>
        <ProductAccessManager />
      </section>
      <section aria-labelledby="access-review" className={`${panelCard} mt-6 gap-4`}>
        <h2 id="access-review" className="text-title font-semibold text-foreground">
          Acessos antigos para revisar ({review.total})
        </h2>
        <p className="text-body text-muted-foreground">
          Estas liberações antigas ainda não têm vencimento e continuam ativas. Confira a compra
          antes de definir o prazo na conta. Não use a data de cadastro como data de compra.
        </p>
        {review.rows.length ? (
          <ul className="divide-y divide-border">
            {review.rows.map((row) => (
              <li key={`${row.userId}-${row.product}`} className="py-3">
                <Link
                  className="inline-flex min-h-11 items-center text-body text-link underline"
                  href={`/admin/contas/${encodeURIComponent(row.userId)}`}
                >
                  {row.name} · {row.email} · {row.product === 'sll' ? 'SLL' : 'Loja Pronta'}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-muted-foreground">
            Nenhuma liberação sem data nesta página.
          </p>
        )}
        <nav aria-label="Páginas dos acessos para revisar" className="flex flex-wrap gap-5">
          {page > 1 ? (
            <Link
              className="inline-flex min-h-11 items-center text-link underline"
              href={`?page=${page - 1}`}
            >
              Anterior
            </Link>
          ) : null}
          {page * 50 < review.total ? (
            <Link
              className="inline-flex min-h-11 items-center text-link underline"
              href={`?page=${page + 1}`}
            >
              Próxima
            </Link>
          ) : null}
        </nav>
      </section>
      <section aria-labelledby="access-history" className={`${panelCard} mt-6 gap-4`}>
        <h2 className="text-title font-semibold text-foreground" id="access-history">
          Alterações recentes
        </h2>
        {events.length ? (
          <ol className="divide-y divide-border">
            {events.map((event) => (
              <li className="py-4 first:pt-0 last:pb-0" key={event.id}>
                <p className="text-body font-semibold text-foreground">
                  {event.action === 'granted' ? 'Acesso liberado' : 'Acesso removido'} ·{' '}
                  {event.product === 'sll' ? 'SLL' : 'Loja Pronta'}
                </p>
                <p className="text-body text-muted-foreground">
                  {event.name} ({event.email}) · {event.reason}
                </p>
                {event.expiresAt ? (
                  <p className="text-body text-muted-foreground">
                    Prazo registrado: até {formatAccessDate(event.expiresAt)}
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'America/Sao_Paulo',
                  }).format(event.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-body text-muted-foreground">Nenhuma alteração registrada ainda.</p>
        )}
      </section>
    </AdminPage>
  );
}
