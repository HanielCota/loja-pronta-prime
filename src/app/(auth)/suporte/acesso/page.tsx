import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { BrandCard } from '@/components/brand/brand-card';
import { CardHeading } from '@/components/brand/card-heading';
import { WhatsappAlternatives } from '@/features/support/components/whatsapp-alternatives';
import { getSupportPhones } from '@/features/support/server/contacts';
import { whatsappContacts } from '@/features/support/whatsapp';

export const metadata: Metadata = { title: 'Não consegue entrar?' };

export default async function PublicAccessPage() {
  await connection();
  const contacts = whatsappContacts(await getSupportPhones()).filter(
    (contact) => contact.topic === 'technical',
  );
  return (
    <BrandCard>
      <CardHeading
        title="Não consegue entrar?"
        description="Fale com o suporte pelo WhatsApp pra receber ajuda com o acesso."
      />
      <div className="flex flex-col gap-6">
        <p className="text-body text-pretty text-muted-foreground">
          Esqueceu a senha?{' '}
          <Link
            href="/recuperar-senha"
            className="font-semibold text-link underline underline-offset-4"
          >
            Redefinir minha senha
          </Link>
          .
        </p>
        <WhatsappAlternatives contacts={contacts} source="login" title="Suporte no WhatsApp" />
        <Link
          href="/entrar"
          className="inline-flex min-h-11 items-center justify-center text-body font-semibold text-link underline underline-offset-4"
        >
          Voltar pro login
        </Link>
      </div>
    </BrandCard>
  );
}
