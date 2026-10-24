import type { Metadata } from 'next';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { requireAdmin } from '@/features/admin/server/access';
import { panelCard } from '@/features/member/components/area-shell';
import { SupportSettingsForm } from '@/features/support/components/settings-form';
import { getSupportPhones } from '@/features/support/server/contacts';

export const metadata: Metadata = { title: 'Suporte · Administração' };

export default async function AdminSupportPage() {
  await requireAdmin('/admin/suporte');
  const phones = await getSupportPhones();
  return (
    <AdminPage title="Suporte">
      <section className={`${panelCard} max-w-2xl`} aria-labelledby="support-settings-title">
        <h2 id="support-settings-title" className="text-title font-semibold">
          Contatos por assunto
        </h2>
        <SupportSettingsForm phones={phones} />
      </section>
    </AdminPage>
  );
}
