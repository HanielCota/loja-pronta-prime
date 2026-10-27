import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { getVisit } from '@/features/auth/server/session';
import { LeaveVisitButton } from '@/features/support/components/leave-visit-button';
import { BLOCKED_DURING_VISIT, refusalMessage } from '@/features/support/visit-rules';

export const metadata: Metadata = { title: 'Ação bloqueada no acesso à conta da aluna' };

type SearchParams = { acao?: string | string[] };

/**
 * Pra onde vai uma ação recusada durante a visita. A mensagem sai da lista de bloqueadas pelo
 * nome da ação: o endereço nunca carrega texto livre.
 */
export default async function VisitBlockedPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const visit = await getVisit();
  if (!visit) redirect('/');
  const { acao } = await searchParams;
  const action = typeof acao === 'string' ? BLOCKED_DURING_VISIT[acao] : undefined;
  const message = action
    ? refusalMessage(action)
    : 'Essa ação não é possível durante o acesso à conta da aluna.';
  return (
    <BrandCard>
      <CardHeading title="Ação bloqueada" description={message} />
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center text-body font-semibold text-link underline underline-offset-4"
        >
          Voltar à conta da aluna
        </Link>
        <LeaveVisitButton className="px-6" />
      </div>
    </BrandCard>
  );
}
