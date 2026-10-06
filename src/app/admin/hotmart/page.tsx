import type { Metadata } from 'next';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { AdminSidebar } from '@/features/admin/components/admin-sidebar';
import { requireAdmin } from '@/features/admin/server/access';
import { HotmartSettingsForm } from '@/features/hotmart/components/settings-form';
import { getHotmartAdminState } from '@/features/hotmart/server/actions';

export const metadata: Metadata = { title: 'Compras Hotmart · Administração' };

export default async function HotmartAdminPage() {
  const session = await requireAdmin('/admin/hotmart');
  const state = await getHotmartAdminState();
  const url = new URL(
    '/api/hotmart/webhook',
    process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  ).toString();
  return (
    <AreaShell
      account={session.user}
      hasChoice={false}
      sidebar={<AdminSidebar current="hotmart" />}
      title="Compras da Hotmart"
    >
      <section className={`${panelCard} gap-5`} aria-labelledby="hotmart-config">
        <div>
          <h2 id="hotmart-config" className="text-title font-semibold">
            Configurar produtos
          </h2>
          <p className="text-body text-muted-foreground">
            {state.configured && state.mappings.length
              ? 'Configuração salva'
              : 'Ainda não configurada'}
            . Cada compra libera somente o acesso indicado abaixo.
          </p>
        </div>
        <p className="text-body break-all">
          Endereço para cadastrar na Hotmart: <strong>{url}</strong>
        </p>
        <HotmartSettingsForm
          configured={state.configured}
          sll={state.mappings.find((item) => item.access === 'sll')?.productUcode ?? ''}
          store={state.mappings.find((item) => item.access === 'loja-pronta')?.productUcode ?? ''}
        />
      </section>
      <section className={`${panelCard} mt-6 gap-4`} aria-labelledby="hotmart-history">
        <h2 id="hotmart-history" className="text-title font-semibold">
          Avisos recentes
        </h2>
        {state.events.length ? (
          <ol className="divide-y divide-border">
            {state.events.map((event) => (
              <li className="py-3 text-body" key={event.id}>
                <strong>{event.event}</strong> · {event.productUcode} · {event.result}
                <span className="block text-muted-foreground">
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(event.receivedAt)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-body text-muted-foreground">Nenhum aviso recebido.</p>
        )}
      </section>
    </AreaShell>
  );
}
