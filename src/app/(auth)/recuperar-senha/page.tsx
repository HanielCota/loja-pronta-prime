import type { Metadata } from 'next';
import { BrandCard } from '@/components/brand/brand-card';
import { RecoverPassword } from '@/features/auth/components/recover-password';
import { sanitizeRedirect } from '@/features/auth/redirect';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Recuperar senha',
  description: 'Receba um link para criar sua primeira senha ou trocar a que já usa.',
};

export default async function RecoverPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <BrandCard>
      <RecoverPassword next={sanitizeRedirect(getParam(params.next))} />
    </BrandCard>
  );
}
