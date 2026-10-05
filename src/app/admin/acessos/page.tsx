import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { ProductAccessManager } from '@/features/admin/components/product-access-manager';
import { getRecentProductAccessEvents } from '@/features/admin/server/actions';
import { requireAdmin } from '@/features/admin/server/access';

export const metadata: Metadata = { title: 'Acessos das alunas · Administração' };

export default async function AdminProductAccessPage() {
  const session = await requireAdmin('/admin/acessos');
  const events = await getRecentProductAccessEvents();

  return (
    <AreaShell account={session.user} hasChoice={false} title="Acessos das alunas">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-body text-muted-foreground">
          Cada produto é controlado separadamente. Remover um não altera o outro.
        </p>
        <Button asChild variant="soft">
          <Link href="/admin">Voltar ao conteúdo do SLL</Link>
        </Button>
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
                <p className="text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(event.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-body text-muted-foreground">Nenhuma alteração registrada ainda.</p>
        )}
      </section>
    </AreaShell>
  );
}
