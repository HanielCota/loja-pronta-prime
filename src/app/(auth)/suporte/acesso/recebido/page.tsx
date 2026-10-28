import { SUPPORT_EMAIL_ENABLED, SUPPORT_EMAIL_UNAVAILABLE } from '@/features/support/email-policy';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';

export const metadata: Metadata = { title: SUPPORT_EMAIL_ENABLED ? 'Recebemos o seu pedido' : 'Ajuda para entrar' };

/** Depois do formulário público sem JavaScript: a mesma resposta, exista a conta ou não. */
export default function PublicAccessReceivedPage() {
  return (
    <BrandCard>
      <CardHeading
        title={SUPPORT_EMAIL_ENABLED ? "Recebemos o seu pedido" : "Ajuda para entrar"}
        description={
          SUPPORT_EMAIL_ENABLED
            ? 'Se este for o e-mail da compra, enviamos um link pra você acompanhar o chamado. Olhe também o spam.'
            : SUPPORT_EMAIL_UNAVAILABLE
        }
      />
      <Link
        href="/entrar"
        className="inline-flex min-h-11 items-center justify-center text-body font-semibold text-link underline underline-offset-4"
      >
        Voltar pro login
      </Link>
    </BrandCard>
  );
}
