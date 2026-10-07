import { ArrowRightIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { CardHeading } from '@/components/brand/card-heading';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { getBrand } from '@/features/brand/server/brand';
import { BRAND_PATH } from '@/features/brand/steps';
import { getOnboarding } from '@/features/loja-pronta/server/conversation';
import { CONVERSATION_PATH, DONE_PATH } from '@/features/loja-pronta/steps';
import { formatWhatsapp } from '@/features/loja-pronta/whatsapp';
import {
  CenteredMemberPage,
  sectionTitleClass,
  panelCard,
} from '@/features/member/components/area-shell';
import { greetingName } from '@/features/products/names';
import { requireProduct } from '@/features/products/server/access';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Respostas enviadas',
};

/** Fim da conversa: a marca é o próximo passo, e já dá pra começar. */
export default async function ConversationDonePage() {
  const { session } = await requireProduct('loja-pronta', DONE_PATH);
  const [{ completedAt, whatsapp }, brand] = await Promise.all([
    getOnboarding(session.user.id),
    getBrand(session.user.id),
  ]);
  if (!completedAt) redirect(CONVERSATION_PATH);
  // Voltou aqui depois (pelo histórico, por exemplo) com a marca já feita: o botão leva pra loja.
  const brandDone = Boolean(brand.completedAt);
  const name = greetingName(session.user);

  const next: ReactNode[] = [
    'Escolher o nome da loja.',
    'Criar o seu logo: você escolhe vendo, e a nossa IA desenha.',
    'Escolher o texto que aparece na loja.',
  ];

  return (
    <CenteredMemberPage
      account={session.user}
      trail={[
        { href: '/', label: 'Início' },
        { href: '/loja-pronta', label: 'Loja Pronta' },
      ]}
      current="Respostas enviadas"
    >
      <div className="flex flex-col gap-6">
        <Logo expression="happy" compact />
        <CardHeading
          className="mb-0"
          title={
            name ? `Pronto, ${name}! Agora vem a sua marca.` : 'Pronto! Agora vem a sua marca.'
          }
          description="Recebemos suas respostas e já preparamos ideias pra você."
        />
      </div>
      <section aria-labelledby="proximos-passos" className={cn(panelCard, 'gap-3')}>
        <h2 id="proximos-passos" className={sectionTitleClass}>
          O que você vai fazer agora
        </h2>
        <ol className="flex flex-col gap-2">
          {next.map((item, index) => (
            <li key={index} className="flex gap-3 text-body text-pretty">
              <span
                aria-hidden="true"
                className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-link forced-colors:border forced-colors:border-[CanvasText]"
              >
                {index + 1}
              </span>
              <span className="pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
        {whatsapp ? (
          <p className="text-body text-pretty text-muted-foreground">
            Seu WhatsApp salvo:{' '}
            <strong className="font-semibold whitespace-nowrap">{formatWhatsapp(whatsapp)}</strong>.{' '}
            Os avisos automáticos estão em breve.
          </p>
        ) : null}
      </section>
      <div className="flex flex-col gap-2">
        <Button asChild>
          <Link href={brandDone ? '/loja-pronta' : BRAND_PATH}>
            {brandDone
              ? 'Ver minha loja'
              : brand.name
                ? 'Continuar minha marca'
                : 'Criar minha marca'}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
        {brandDone ? null : (
          <Button asChild variant="ghost">
            <Link href="/loja-pronta">Fazer depois</Link>
          </Button>
        )}
      </div>
    </CenteredMemberPage>
  );
}
