import type { Metadata } from 'next';
import { panelCard } from '@/features/member/components/area-shell';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { NewAccountForm } from '@/features/admin/components/new-account-form';
import { requireAdmin } from '@/features/admin/server/access';

export const metadata: Metadata = { title: 'Criar conta · Administração' };

/** Conta nova feita à mão (fora da Hotmart): aluna ou admin, com os produtos escolhidos. */
export default async function AdminNewAccountPage() {
  await requireAdmin('/admin/contas/nova');

  return (
    <AdminPage
      backLink={{ href: '/admin/contas', label: 'Todas as contas' }}
      title="Criar conta"
      intro="Para quem não comprou pela Hotmart, ou para uma nova administradora."
    >
      <section aria-label="Dados da conta nova" className={`${panelCard} max-w-2xl gap-5`}>
        <NewAccountForm />
      </section>
    </AdminPage>
  );
}
