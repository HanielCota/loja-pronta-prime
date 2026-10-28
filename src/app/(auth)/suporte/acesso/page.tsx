import { randomUUID } from 'node:crypto';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { visibleSituations } from '@/features/support/catalog';
import { PublicAccessForm } from '@/features/support/components/public-access-form';
import { SupportHoursNote } from '@/features/support/components/support-hours-note';
import { WhatsappAlternatives } from '@/features/support/components/whatsapp-alternatives';
import { loadSupportCatalog } from '@/features/support/server/catalog';
import { loadSupportFrame } from '@/features/support/server/page-data';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Não consegue entrar?',
  description: 'Peça ajuda pra entrar na sua área do Escala Shop.',
};

/**
 * Ajuda pra quem não consegue entrar (o suporte de dentro exige login). Abre um chamado e manda
 * um link pro e-mail: é ele que prova que a pessoa lê aquele e-mail. O WhatsApp de sempre aparece
 * como segunda opção.
 */
export default async function PublicAccessPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const [catalog, frame] = await Promise.all([loadSupportCatalog(), loadSupportFrame()]);
  const access = catalog.find((topic) => topic.id === 'access');
  const situations = access ? visibleSituations(access).map((item) => ({ id: item.id, label: item.label })) : [];
  const technical = frame.contacts.filter((contact) => contact.topic === 'technical');
  return (
    <BrandCard>
      <CardHeading
        title="Não consegue entrar?"
        description="Conte o que está acontecendo. Mandamos um link pro seu e-mail pra você acompanhar a resposta."
      />
      <div className="flex flex-col gap-6">
        <p className="text-body text-pretty text-muted-foreground">
          Esqueceu a senha? Dá pra resolver na hora em{' '}
          <Link href="/recuperar-senha" className="font-semibold text-link underline underline-offset-4">
            “Esqueci minha senha”
          </Link>
          .
        </p>
        <PublicAccessForm situations={situations} error={getParam(params.erro_envio) ?? null} submissionId={randomUUID()} />
        <SupportHoursNote hours={frame.hours} notice={frame.notice} pause={frame.pause} />
        <WhatsappAlternatives contacts={technical} source="login" />
        <Link href="/entrar" className="inline-flex min-h-11 items-center justify-center text-body font-semibold text-link underline underline-offset-4">
          Voltar pro login
        </Link>
      </div>
    </BrandCard>
  );
}
