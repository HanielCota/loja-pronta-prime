import type { Metadata } from 'next';
import { requireAdmin } from '@/features/admin/server/access';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { panelCard } from '@/features/member/components/area-shell';
import { SupportSettingsForm } from '@/features/support/components/settings-form';
import { getSupportPhones } from '@/features/support/server/contacts';

export const metadata: Metadata = { title: 'Suporte no WhatsApp' };

export default async function SupportSettingsPage() {
  await requireAdmin('/admin/suporte/configuracoes');
  const phones = await getSupportPhones();
  return (
    <AdminPage
      title="Suporte no WhatsApp"
      intro="Configure os contatos que as alunas usam pra pedir ajuda."
    >
      <section id="whatsapp" aria-labelledby="whatsapp-title" className={panelCard}>
        <h2 id="whatsapp-title" className="text-headline font-semibold">
          Contatos por assunto
        </h2>
        <p className="text-body text-muted-foreground">
          O atendimento é pelo WhatsApp. Os contatos aparecem no perfil e na ajuda para entrar.
        </p>
        <SupportSettingsForm phones={phones} />
      </section>
    </AdminPage>
  );
}
