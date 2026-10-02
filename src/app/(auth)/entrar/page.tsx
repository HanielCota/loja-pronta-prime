import { InboxIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { LoginForm } from '@/features/auth/components/login-form';
import { parseLoginReason } from '@/features/auth/login-reason';
import { sanitizeRedirect } from '@/features/auth/redirect';
import { resolvePostLoginPath } from '@/features/auth/server/post-login';
import { getParam, type SearchParams } from '@/lib/search-params';
import { auth } from '@/server/auth/auth';

export const metadata: Metadata = {
  title: 'Entrar',
  description:
    'Entre na sua área da Loja Pronta Prime pra aprender a vender na Shopee ou acompanhar a montagem da sua loja.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const next = sanitizeRedirect(getParam(params.next));

  // Já entrou: não mostra o login de novo, segue pra dentro (ou pro primeiro acesso).
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect(
      resolvePostLoginPath(next, { mustChangePassword: session.user.mustChangePassword !== false }),
    );
  }

  return (
    <>
      <BrandCard>
        <CardHeading
          title="Sua loja na Shopee começa aqui"
          description="Entre com o email que você usou na compra."
        />
        <LoginForm next={next} initialError={parseLoginReason(getParam(params.motivo))} />
      </BrandCard>
      <p className="flex items-start gap-3 rounded-2xl border border-border px-4 py-3.5 text-sm text-pretty text-muted-foreground">
        <InboxIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        <span>
          <strong className="font-semibold text-foreground">Acabou de comprar?</strong> Seu acesso
          chega no email da compra em alguns minutos. Não achou? Procura por “Loja Pronta Prime” no
          spam e na aba Promoções.
        </span>
      </p>
    </>
  );
}
