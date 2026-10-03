import type { Metadata } from 'next';
import { BrandCard } from '@/components/brand/brand-card';
import {
  InvalidResetLink,
  ResetPasswordForm,
} from '@/features/auth/components/reset-password-form';
import { sanitizeRedirect } from '@/features/auth/redirect';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Criar senha',
  description: 'Crie sua senha pra entrar na Loja Pronta Prime.',
};

/** Destino do link enviado por email (o Better Auth adiciona `?token=` ou `?error=`). */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const token = getParam(params.token);
  const linkIsValid = token && !getParam(params.error);
  // Destino que ela queria antes de esquecer a senha (veio no link do email).
  const next = sanitizeRedirect(getParam(params.next));

  return (
    <BrandCard>
      {linkIsValid ? (
        <ResetPasswordForm token={token} next={next} />
      ) : (
        <InvalidResetLink next={next} />
      )}
    </BrandCard>
  );
}
