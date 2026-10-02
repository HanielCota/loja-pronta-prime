import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { PageShell } from '@/components/brand/page-shell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Página não encontrada',
};

export default function NotFound() {
  return (
    <PageShell>
      <BrandCard expression="worried">
        <CardHeading
          title="Essa página não existe"
          description="O link pode estar errado ou a página mudou de lugar. Bora voltar pro começo?"
        />
        <Button asChild>
          <Link href="/entrar">Ir pro login</Link>
        </Button>
      </BrandCard>
    </PageShell>
  );
}
