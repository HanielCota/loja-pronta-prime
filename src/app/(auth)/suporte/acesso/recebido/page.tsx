import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';

export const metadata: Metadata = { title: 'Recebemos o seu pedido' };

/** Depois do formulário público sem JavaScript: a mesma resposta, exista a conta ou não. */
export default function PublicAccessReceivedPage() {
  return (
    <BrandCard>
      <CardHeading
        title="Recebemos o seu pedido"
        description="Se este for o e-mail da compra, enviamos um link pra você acompanhar o chamado. Olhe também o spam."
      />
      <Link href="/entrar" className="inline-flex min-h-11 items-center justify-center text-body font-semibold text-link underline underline-offset-4">
        Voltar pro login
      </Link>
    </BrandCard>
  );
}
