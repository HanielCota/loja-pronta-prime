import type { Metadata } from 'next';
import { AdminShell } from '@/features/admin/components/admin-shell';
import { requireAdmin } from '@/features/admin/server/access';
import { panelCard } from '@/features/member/components/area-shell';
import { LeadForm } from '@/features/leads/components/lead-form';
import { leadOptions } from '@/features/leads/server/queries';
import { EMPTY_LEAD } from '@/features/leads/model';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Novo contato · Contatos', robots: { index: false } };
export default async function NewLeadPage() {
  const session = await requireAdmin('/leads/novo');
  const { owners } = await leadOptions();
  return (
    <AdminShell
      account={session.user}
      current="leads"
      title="Novo contato"
      intro="Guarde os dados para continuar a conversa depois."
      backLink={{ href: '/leads', label: 'Voltar aos contatos' }}
    >
      <section aria-label="Cadastro de contato" className={cn(panelCard, 'max-w-3xl')}>
        <LeadForm owners={owners} initial={{ ...EMPTY_LEAD, ownerId: session.user.id }} />
      </section>
    </AdminShell>
  );
}
