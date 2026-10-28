import { readClock } from '@/features/support/clock';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { RequesterTicketView } from '@/features/support/components/requester-ticket-view';
import { loadSupportCatalog } from '@/features/support/server/catalog';
import { loadSupportFrame } from '@/features/support/server/page-data';
import { loadRequesterThread } from '@/features/support/server/queries';
import { ticketFromPublicToken } from '@/features/support/server/tickets';
import { SEND_NOTICE_PARAM } from '@/features/support/send-notice';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Seu chamado', robots: { index: false, follow: false } };

/**
 * O chamado aberto sem login, pelo link mágico do e-mail. Mostra só aquele chamado: sem menu, sem
 * outros chamados, sem dados da conta. Abrir o link confirma o e-mail do chamado.
 */
export default async function PublicTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const ticket = await ticketFromPublicToken(token);
  if (!ticket)
    return (
      <BrandCard>
        <CardHeading title="Este link não vale mais" description="Os links do chamado valem 7 dias. Peça ajuda de novo e mandamos um link novo." />
        <Link href="/suporte/acesso" className="inline-flex min-h-11 items-center justify-center text-body font-semibold text-link underline underline-offset-4">
          Pedir ajuda de novo
        </Link>
      </BrandCard>
    );
  const [thread, catalog, frame] = await Promise.all([loadRequesterThread(ticket), loadSupportCatalog(), loadSupportFrame()]);
  return (
    <>
      <h1 className="text-title font-semibold text-balance">{ticket.subject}</h1>
      <RequesterTicketView
        thread={thread}
        now={readClock()}
        catalog={catalog}
        schedule={frame.schedule}
        autoCloseDays={frame.settings.autoCloseDays}
        hours={frame.hours}
        pause={frame.pause}
        token={token}
        sendError={getParam(query.erro_envio) ?? null}
        sendNotice={getParam(query[SEND_NOTICE_PARAM]) ?? null}
      />
    </>
  );
}
