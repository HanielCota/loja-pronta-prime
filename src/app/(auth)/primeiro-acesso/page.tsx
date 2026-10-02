import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { BrandCard } from '@/components/brand/brand-card';
import { FirstAccessForm } from '@/features/auth/components/first-access-form';
import { sanitizeRedirect } from '@/features/auth/redirect';
import { resolvePostLoginPath } from '@/features/auth/server/post-login';
import { getParam, type SearchParams } from '@/lib/search-params';
import { auth } from '@/server/auth/auth';

export const metadata: Metadata = {
  title: 'Primeiro acesso',
  description: 'Crie a sua senha pra entrar na Loja Pronta Prime.',
};

/** Depois do login com a senha temporária: a aluna cria a própria senha antes de seguir. */
export default async function FirstAccessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const next = sanitizeRedirect(getParam(params.next));
  const session = await auth.api.getSession({ headers: await headers() });

  // Sem sessão: volta pro login, avisando o motivo e mantendo o destino.
  if (!session) {
    redirect(
      `/entrar?${new URLSearchParams({ motivo: 'sessao-expirada', ...(next ? { next } : {}) })}`,
    );
  }
  // Já criou a senha: segue pro destino.
  if (session.user.mustChangePassword === false) redirect(resolvePostLoginPath(next));

  return (
    <BrandCard>
      <FirstAccessForm email={session.user.email} next={next} />
    </BrandCard>
  );
}
