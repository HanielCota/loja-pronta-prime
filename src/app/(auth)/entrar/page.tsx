import { CircleCheckIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { LoginForm } from '@/features/auth/components/login-form';
import { EMAIL_CONFIRMED_REASON, parseLoginReason } from '@/features/auth/login-reason';
import { sanitizeRedirect } from '@/features/auth/redirect';
import { resolvePostLoginPath } from '@/features/auth/server/post-login';
import { getActiveSession, needsFirstPassword } from '@/features/auth/server/session';
import { reportAuthError } from '@/server/auth/report-error';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Entrar',
  description:
    'Entre na sua área da Loja Pronta Prime pra aprender a vender na Shopee ou acompanhar a montagem da sua loja.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const next = sanitizeRedirect(getParam(params.next));

  // Já entrou: não mostra o login de novo, segue pra dentro (ou pro primeiro acesso). Se a
  // sessão não puder ser lida (banco fora do ar), mostra o login mesmo assim: a página de erro
  // mandaria de volta pra cá, num ciclo sem saída.
  let session: Awaited<ReturnType<typeof getActiveSession>> = null;
  try {
    session = await getActiveSession();
  } catch (error) {
    reportAuthError('leitura da sessão no login', error);
  }
  if (session) {
    redirect(resolvePostLoginPath(next, { mustChangePassword: needsFirstPassword(session.user) }));
  }

  return (
    <BrandCard>
      <CardHeading
        title="Sua loja na Shopee começa aqui"
        description="Entre com o email que você usou na compra."
      />
      {getParam(params.motivo) === EMAIL_CONFIRMED_REASON && !getParam(params.error) ? (
        <p className="mb-5 flex items-start gap-3 rounded-2xl bg-primary-soft px-4 py-3.5 text-sm text-pretty text-foreground">
          <CircleCheckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-link" />
          <span>
            <strong className="font-semibold">Email confirmado.</strong> Entre com seu email e sua
            senha.
          </span>
        </p>
      ) : null}
      <LoginForm
        next={next}
        initialError={parseLoginReason(getParam(params.motivo), getParam(params.error))}
      />
      <p className="mt-6 text-center">
        <Link
          href="/privacidade"
          className="inline-flex min-h-11 items-center text-sm font-medium text-link underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Política de Privacidade
        </Link>
      </p>
    </BrandCard>
  );
}
