'use client';

import Link from 'next/link';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { PageShell } from '@/components/brand/page-shell';
import { Button } from '@/components/ui/button';

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

/** Erro inesperado numa página: nunca mostra a mensagem técnica, só o que fazer. */
export default function ErrorPage({ error, retry }: ErrorPageProps) {
  return (
    <PageShell>
      <BrandCard expression="worried">
        <CardHeading
          title="Algo deu errado"
          description="Tente de novo. Se continuar, fale com o suporte."
        />
        <div className="flex flex-col items-center gap-4">
          <Button type="button" onClick={() => retry()}>
            Tentar de novo
          </Button>
          {/* O início leva pro login quem não estiver dentro: serve pras duas situações. */}
          <Button asChild variant="link" size="inline">
            <Link href="/">Voltar pro início</Link>
          </Button>
          {/* Public help remains available when the member page fails. */}
          <Button asChild variant="link" size="inline">
            <Link href="/suporte/acesso">Falar com o suporte</Link>
          </Button>
          {error.digest ? (
            // Código pra ajudar o suporte a achar o erro nos logs do servidor.
            <p className="text-sm text-muted-foreground">Código do erro: {error.digest}</p>
          ) : null}
        </div>
      </BrandCard>
    </PageShell>
  );
}
