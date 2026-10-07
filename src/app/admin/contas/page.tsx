import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Search } from 'lucide-react';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { AdminSidebar } from '@/features/admin/components/admin-sidebar';
import { Button } from '@/components/ui/button';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { hasAdminRole } from '@/features/admin/access';
import { productLabel } from '@/features/admin/account-labels';
import { requireAdmin } from '@/features/admin/server/access';
import { ACCOUNTS_PAGE_SIZE, listAccounts } from '@/features/admin/server/accounts';

export const metadata: Metadata = { title: 'Contas · Administração' };

const pageLinkClass =
  'inline-flex min-h-11 items-center text-body text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Todas as contas, com busca por nome ou email (formulário GET: funciona sem JavaScript). */
export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const session = await requireAdmin('/admin/contas');
  const { q = '', pagina } = await searchParams;
  const page = Math.max(1, Number.parseInt(pagina ?? '1', 10) || 1);
  const { accounts, total } = await listAccounts({ query: q, page });
  const pages = Math.max(1, Math.ceil(total / ACCOUNTS_PAGE_SIZE));
  const pageHref = (target: number) =>
    `/admin/contas?${new URLSearchParams({ ...(q ? { q } : {}), pagina: String(target) })}`;
  const count = `${total} ${q ? 'encontrada' : 'conta'}${total === 1 ? '' : 's'}`;

  return (
    <AreaShell
      account={session.user}
      hasChoice={false}
      sidebar={<AdminSidebar current="accounts" />}
      title="Contas"
      intro="Abra uma conta para editar os dados, liberar produtos ou bloquear o acesso."
    >
      <search className="mb-6">
        <form action="/admin/contas" className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <FloatingLabelInput
              defaultValue={q}
              id="accounts-search"
              label="Buscar por nome ou email"
              name="q"
              type="search"
            />
          </div>
          <Button className="sm:w-auto" type="submit" variant="soft">
            <Search aria-hidden="true" />
            Buscar
          </Button>
        </form>
      </search>

      <section aria-labelledby="accounts-list" className={`${panelCard} gap-4`}>
        <h2 className="text-title font-semibold text-foreground" id="accounts-list">
          {count}
        </h2>
        {accounts.length ? (
          <ul className="divide-y divide-border">
            {accounts.map((account) => {
              const tags = [
                ...account.products.map(productLabel),
                hasAdminRole(account.role) ? 'Admin' : null,
                account.banned ? 'Bloqueada' : null,
              ].filter(Boolean);
              return (
                <li key={account.id}>
                  <Link
                    className="-mx-3 flex min-h-11 items-center gap-3 rounded-2xl px-3 py-4 outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    href={`/admin/contas/${account.id}`}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body font-semibold text-foreground">
                        {account.name}
                      </span>
                      <span className="truncate text-body text-muted-foreground">
                        {account.email}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {tags.length ? tags.join(' · ') : 'Sem produto'}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-body text-muted-foreground">Nenhuma conta encontrada.</p>
        )}
        {pages > 1 ? (
          <nav aria-label="Páginas" className="flex items-center justify-between gap-4">
            {page > 1 ? (
              <Link className={pageLinkClass} href={pageHref(page - 1)}>
                Anterior
              </Link>
            ) : (
              <span />
            )}
            <p className="text-body text-muted-foreground">
              Página {page} de {pages}
            </p>
            {page < pages ? (
              <Link className={pageLinkClass} href={pageHref(page + 1)}>
                Próxima
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </AreaShell>
  );
}
