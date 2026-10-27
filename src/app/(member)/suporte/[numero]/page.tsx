import { readClock } from '@/features/support/clock';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AutoRefresh } from '@/features/admin/components/auto-refresh';
import { AreaShell } from '@/features/member/components/area-shell';
import { requireStudent } from '@/features/products/server/access';
import { RequesterTicketView } from '@/features/support/components/requester-ticket-view';
import { loadSupportCatalog } from '@/features/support/server/catalog';
import { loadSupportFrame } from '@/features/support/server/page-data';
import { getMyTicket } from '@/features/support/server/queries';
import { SEND_NOTICE_PARAM } from '@/features/support/send-notice';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Chamado' };

/** A conversa de um chamado da aluna. Relê a cada 15 segundos com a aba à vista. */
export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ numero: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { numero } = await params;
  const { session } = await requireStudent(`/suporte/${numero}`);
  const query = await searchParams;
  const [thread, catalog, frame] = await Promise.all([
    getMyTicket(Number(numero), session.user.id),
    loadSupportCatalog(),
    loadSupportFrame(),
  ]);
  if (!thread) notFound();
  const sent = getParam(query.enviado) === '1';
  const notice = getParam(query[SEND_NOTICE_PARAM]) ?? null;
  return (
    <AreaShell
      account={session.user}
      hasChoice
      narrow
      crumb="Chamado"
      title={thread.ticket.subject}
      intro={sent ? `Chamado enviado. Avisamos quando o suporte responder.${notice ? ` ${notice}` : ''}` : undefined}
    >
      <AutoRefresh everyMs={15_000} />
      <RequesterTicketView
        thread={thread}
        now={readClock()}
        catalog={catalog}
        schedule={frame.schedule}
        autoCloseDays={frame.settings.autoCloseDays}
        hours={frame.hours}
        pause={frame.pause}
        sendError={getParam(query.erro_envio) ?? null}
        sendNotice={sent ? null : notice}
      />
    </AreaShell>
  );
}
