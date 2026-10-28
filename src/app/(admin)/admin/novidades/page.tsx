import type { Metadata } from 'next';
import { AdminPage } from '@/features/admin/components/admin-shell';
import { requireAdmin } from '@/features/admin/server/access';
import { panelCard, statusBadge } from '@/features/member/components/area-shell';
import { patchNotes } from '@/features/patch-notes/entries';

export const metadata: Metadata = { title: 'Novidades' };

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeZone: 'America/Sao_Paulo',
});

export default async function UpdatesPage() {
  await requireAdmin('/admin/novidades');

  return (
    <AdminPage
      title="Novidades"
      intro="Acompanhe o que mudou na plataforma, das alterações mais recentes às mais antigas."
    >
      <p className="text-body text-pretty text-muted-foreground">
        Histórico exclusivo da administração. As datas seguem o horário de Brasília e indicam quando
        as mudanças foram registradas. Quando houver uma liberação pendente, ela será informada no
        texto.
      </p>
      <ol aria-label="Histórico de alterações" className="flex flex-col gap-6">
        {patchNotes.map((day) => (
          <li key={day.date}>
            <section className={`${panelCard} gap-6`} aria-labelledby={`updates-${day.date}`}>
              <h2 id={`updates-${day.date}`} className="text-headline font-semibold text-balance">
                <time dateTime={day.date}>
                  {dateFormat.format(new Date(`${day.date}T12:00:00-03:00`))}
                </time>
              </h2>
              <ul className="divide-y divide-border">
                {day.changes.map((change) => (
                  <li key={change.title} className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0">
                    <span className={statusBadge}>{change.kind}</span>
                    <h3 className="text-body font-semibold text-pretty">{change.title}</h3>
                    <p className="max-w-prose text-body text-pretty text-muted-foreground">
                      {change.description}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </li>
        ))}
      </ol>
    </AdminPage>
  );
}
