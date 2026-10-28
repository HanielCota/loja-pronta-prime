import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { getVisit } from '@/features/auth/server/session';
import { LeaveVisitButton } from '@/features/support/components/leave-visit-button';
import { blockedMessage } from '@/features/support/visit-rules';
import { visitDestination } from '@/features/support/visit-target';
import { VISIT_OVER_PATH } from '@/features/support/visit-window';

export const metadata: Metadata = { title: 'Ação bloqueada no acesso à conta da aluna' };

type SearchParams = { acao?: string | string[] };

/**
 * A página da aluna de onde a ação veio, pra voltar pra ela. Só caminhos da área da aluna
 * (`visitDestination`); qualquer outra coisa volta pro início.
 */
async function pageBefore(): Promise<string> {
  const referer = (await headers()).get('referer');
  if (!referer) return '/';
  try {
    return visitDestination(new URL(referer).pathname);
  } catch {
    return '/';
  }
}

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
  if (visit.over) redirect(VISIT_OVER_PATH);
  const { acao } = await searchParams;
  const message =
    (typeof acao === 'string' ? blockedMessage(acao) : null) ??
    'Essa ação não é possível enquanto você usa a conta da aluna.';
  return (
    <BrandCard>
      <CardHeading title="Ação bloqueada" description={message} />
      <div className="flex flex-col items-center gap-3">
        <Link
          href={await pageBefore()}
          className="inline-flex min-h-11 items-center justify-center text-body font-semibold text-link underline underline-offset-4"
        >
          Voltar à conta da aluna
        </Link>
        <LeaveVisitButton className="px-6" />
      </div>
    </BrandCard>
  );
}
