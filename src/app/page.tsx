import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { PageShell } from '@/components/brand/page-shell';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { getActiveSession, needsFirstPassword } from '@/features/auth/server/session';

export const metadata: Metadata = {
  title: 'Início',
};

/**
 * Início de quem já entrou. A área da aluna (aulas, ferramentas, a loja) ainda não existe:
 * por enquanto esta tela confirma o acesso e permite sair, em vez de mandar de volta pro login.
 */
export default async function HomePage() {
  const session = await getActiveSession();
  if (!session) redirect('/entrar');
  if (needsFirstPassword(session.user)) redirect('/primeiro-acesso');

  const firstName = session.user.name.trim().split(/\s+/)[0];

  return (
    <PageShell>
      <BrandCard expression="happy">
        <CardHeading
          title={firstName ? `Você entrou, ${firstName}!` : 'Você entrou!'}
          description="Sua área de aluna está sendo preparada. Em breve, aqui vão estar suas aulas, as ferramentas e o acompanhamento da sua loja."
        />
        <div className="flex flex-col gap-4">
          <p className="rounded-2xl bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
            Conta:{' '}
            <strong className="font-semibold wrap-anywhere text-foreground">
              {session.user.email}
            </strong>
          </p>
          <SignOutButton />
        </div>
      </BrandCard>
    </PageShell>
  );
}
