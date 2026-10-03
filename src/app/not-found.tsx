import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { PageShell } from '@/components/brand/page-shell';
import { Button } from '@/components/ui/button';
import { getActiveSession } from '@/features/auth/server/session';
import { MemberNavbar } from '@/features/member/components/member-navbar';

export const metadata: Metadata = {
  title: 'Página não encontrada',
};

export default async function NotFound() {
  // Quem está dentro vê a própria conta no topo, como nas outras telas. Sem conseguir ler a
  // sessão (banco fora do ar), a barra de quem não entrou: a página não pode quebrar por isso.
  const session = await getActiveSession().catch(() => null);

  return (
    <PageShell navbar={session ? <MemberNavbar account={session.user} /> : undefined}>
      <BrandCard expression="worried">
        <CardHeading
          title="Essa página não existe"
          description="O link pode estar errado, ou a página mudou de lugar."
        />
        <Button asChild>
          {/* O início leva pro login quem não estiver dentro: serve pras duas situações. */}
          <Link href="/">Voltar pro início</Link>
        </Button>
      </BrandCard>
    </PageShell>
  );
}
