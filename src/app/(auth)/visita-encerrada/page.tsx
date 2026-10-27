import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { getVisit } from '@/features/auth/server/session';
import { LeaveVisitButton } from '@/features/support/components/leave-visit-button';
import { VISIT_OVER_MESSAGE } from '@/features/support/visit-window';

export const metadata: Metadata = { title: 'Acesso à conta da aluna terminou' };

/**
 * Depois de 1 hora, a plataforma recusa tudo na conta da aluna. A sessão ainda vive uns minutos
 * pra "Voltar ao painel" devolver a sessão da equipe; depois disso, só entrando de novo.
 */
export default async function VisitOverPage() {
  const visit = await getVisit();
  return (
    <BrandCard>
      <CardHeading title="O acesso terminou" description={VISIT_OVER_MESSAGE} />
      {visit ? (
        <div className="flex justify-center">
          <LeaveVisitButton className="px-6" />
        </div>
      ) : (
        <Link
          href="/entrar"
          className="inline-flex min-h-11 items-center justify-center text-body font-semibold text-link underline underline-offset-4"
        >
          Entrar de novo
        </Link>
      )}
    </BrandCard>
  );
}
