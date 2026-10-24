import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Archive, ArchiveRestore, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { requireAdmin } from '@/features/admin/server/access';
import { panelCard } from '@/features/member/components/area-shell';
import { LeadForm } from '@/features/leads/components/lead-form';
import { LeadBadge } from '@/features/leads/components/lead-badge';
import { NoteForm } from '@/features/leads/components/note-form';
import { getLead, leadOptions } from '@/features/leads/server/queries';
import { archiveLead } from '@/features/leads/server/actions';
import { interestLabels } from '@/features/leads/model';
import { formatWhatsapp, whatsappLink } from '@/features/loja-pronta/whatsapp';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Contato · Contatos', robots: { index: false } };
const date = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string }>;
}) {
  const { id } = await params;
  await requireAdmin(`/leads/${id}`);
  const [result, options, search] = await Promise.all([getLead(id), leadOptions(), searchParams]);
  if (!result) notFound();
  const { lead, activities } = result;
  const initial = {
    name: lead.name,
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    stage: lead.stage,
    product: lead.product,
    source: lead.source,
    ownerId: lead.ownerId ?? '',
    nextContact: lead.nextContact ?? '',
    tags: lead.tags.join(', '),
    lostReason: lead.lostReason ?? '',
  };
  return (
    <AdminPage
      title={lead.name}
      intro={`${interestLabels[lead.product]} · ${lead.source}`}
      backLink={{ href: '/leads', label: 'Voltar aos contatos' }}
    >
      {search.salvo === 'sim' ? (
        <output className="rounded-2xl bg-muted p-4 text-body text-progress-text">
          Contato salvo.
        </output>
      ) : null}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section aria-labelledby="lead-data" className={cn(panelCard, 'gap-5')}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="lead-data" className="text-title font-semibold">
              Dados do contato
            </h2>
            <LeadBadge stage={lead.stage} />
          </div>
          {lead.archivedAt ? (
            <div className="flex flex-col gap-3">
              <p className="text-body text-muted-foreground">
                Este contato está arquivado. Restaure para editar ou continuar a conversa.
              </p>
              <p className="text-body break-words">
                {lead.email}
                {lead.phone ? ` · ${formatWhatsapp(lead.phone)}` : ''}
              </p>
              <form action={archiveLead}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="restore" value="yes" />
                <Button type="submit" variant="soft">
                  <ArchiveRestore aria-hidden="true" />
                  Restaurar contato
                </Button>
              </form>
            </div>
          ) : (
            <LeadForm
              id={id}
              version={lead.updatedAt.toISOString()}
              initial={initial}
              owners={options.owners}
            />
          )}
        </section>
        <div className="flex flex-col gap-6">
          {!lead.archivedAt ? (
            <section className={cn(panelCard, 'gap-4')} aria-label="Contato e anotações">
              <div className="flex flex-wrap gap-3">
                {lead.phone ? (
                  <Button asChild variant="soft" className="sm:w-auto">
                    <a
                      href={whatsappLink(lead.phone, '')}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle aria-hidden="true" />
                      Abrir WhatsApp<span className="sr-only"> (abre em outra aba)</span>
                    </a>
                  </Button>
                ) : null}
                {lead.email ? (
                  <Button asChild variant="ghost" className="sm:w-auto">
                    <a href={`mailto:${lead.email}`}>
                      <Mail aria-hidden="true" />
                      Escrever email
                    </a>
                  </Button>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                O contato abre no seu aplicativo. Registre a conversa abaixo e marque o próximo
                retorno nos dados.
              </p>
              <NoteForm id={id} />
            </section>
          ) : null}
          <section aria-labelledby="lead-history" className={cn(panelCard, 'gap-5')}>
            <h2 id="lead-history" className="text-title font-semibold">
              Histórico
            </h2>
            <ol className="divide-y divide-border">
              {activities.map(({ activity, actorName }) => (
                <li key={activity.id} className="flex flex-col gap-2 py-4 first:pt-0">
                  <p className="text-body break-words whitespace-pre-wrap">{activity.body}</p>
                  <p className="text-sm text-muted-foreground">
                    {actorName || 'Administrador'} ·{' '}
                    <time dateTime={activity.createdAt.toISOString()}>
                      {date.format(activity.createdAt)}
                    </time>
                  </p>
                </li>
              ))}
            </ol>
            {activities.length === 100 ? (
              <p className="text-sm text-muted-foreground">
                As últimas 100 anotações e alterações estão sendo exibidas.
              </p>
            ) : null}
          </section>
          {!lead.archivedAt ? (
            <section className={cn(panelCard, 'gap-3')} aria-label="Arquivar contato">
              <h2 className="text-body font-semibold">Guardar para depois</h2>
              <p className="text-body text-muted-foreground">
                Arquivar tira o contato da lista ativa e dos indicadores. O histórico fica salvo e
                você pode restaurar depois.
              </p>
              <form action={archiveLead}>
                <input type="hidden" name="id" value={id} />
                <Button variant="ghost" type="submit">
                  <Archive aria-hidden="true" />
                  Arquivar contato
                </Button>
              </form>
            </section>
          ) : null}
        </div>
      </div>
    </AdminPage>
  );
}
