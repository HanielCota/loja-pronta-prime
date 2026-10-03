import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { CardHeading } from '@/components/brand/card-heading';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { getOnboarding } from '@/features/loja-pronta/server/conversation';
import { CONVERSATION_PATH, DONE_PATH } from '@/features/loja-pronta/steps';
import { formatWhatsapp } from '@/features/loja-pronta/whatsapp';
import {
  CenteredMemberPage,
  sectionTitleClass,
  panelCard,
} from '@/features/member/components/area-shell';
import { firstName } from '@/features/products/names';
import { requireProduct } from '@/features/products/server/access';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Respostas enviadas',
};

/** Fim da conversa: o que acontece agora, de cada lado. */
export default async function ConversationDonePage() {
  const { session } = await requireProduct('loja-pronta', DONE_PATH);
  const { completedAt, whatsapp } = await getOnboarding(session.user.id);
  if (!completedAt) redirect(CONVERSATION_PATH);
  const name = firstName(session.user.name);

  const groups: { id: string; title: string; accent: boolean; items: ReactNode[] }[] = [
    {
      id: 'equipe',
      title: 'O que a equipe faz agora',
      accent: true,
      items: [
        'Cria opções de logo e de descrição pra sua loja.',
        whatsapp ? (
          <>
            Avisa você no WhatsApp{' '}
            <strong className="font-semibold whitespace-nowrap">{formatWhatsapp(whatsapp)}</strong>{' '}
            em até 24 horas.
          </>
        ) : (
          'Avisa você no WhatsApp em até 24 horas.'
        ),
      ],
    },
    {
      id: 'voce',
      title: 'Enquanto isso',
      accent: false,
      items: [
        'Fique de olho no WhatsApp. A próxima escolha é sua.',
        'Acompanhe cada fase da loja na Loja Pronta.',
      ],
    },
  ];

  return (
    <CenteredMemberPage back={{ href: '/loja-pronta', label: 'Loja Pronta' }}>
      <div className="flex flex-col gap-6">
        <Logo expression="happy" compact />
        <CardHeading
          className="mb-0"
          title={name ? `Pronto, ${name}! Agora é com a gente.` : 'Pronto! Agora é com a gente.'}
          description="Recebemos suas respostas."
        />
      </div>
      {groups.map((group) => (
        <section
          key={group.id}
          aria-labelledby={`proximos-${group.id}`}
          className={cn(panelCard, 'gap-3')}
        >
          <h2 id={`proximos-${group.id}`} className={sectionTitleClass}>
            {group.title}
          </h2>
          <ul className="flex flex-col gap-2">
            {group.items.map((item, index) => (
              <li key={index} className="flex gap-3 text-body text-pretty">
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-2.5 size-2 shrink-0 rounded-full forced-colors:bg-[CanvasText]',
                    group.accent ? 'bg-primary' : 'bg-muted-foreground',
                  )}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Button asChild>
        <Link href="/loja-pronta">Ver a minha loja</Link>
      </Button>
    </CenteredMemberPage>
  );
}
