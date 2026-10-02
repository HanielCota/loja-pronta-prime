import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { CardHeading } from '@/components/brand/card-heading';
import { Logo } from '@/components/brand/logo';
import { PageShell } from '@/components/brand/page-shell';
import { Button } from '@/components/ui/button';
import { getOnboarding } from '@/features/onboarding/server/conversation';
import { CONVERSATION_PATH, DONE_PATH, formatWhatsapp } from '@/features/onboarding/steps';
import { firstName } from '@/features/products/names';
import { requireProduct } from '@/features/products/server/access';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Respostas enviadas',
};

/** Fim da conversa: o que acontece agora, de cada lado. */
export default async function ConversationDonePage() {
  const { session, products } = await requireProduct('loja-pronta', DONE_PATH);
  const { completedAt, whatsapp } = await getOnboarding(session.user.id);
  if (!completedAt) redirect(CONVERSATION_PATH);
  const name = firstName(session.user.name);

  const groups: { id: string; title: string; accent: boolean; items: ReactNode[] }[] = [
    {
      id: 'equipe',
      title: 'Nossa equipe, agora',
      accent: true,
      items: [
        'Cria opções de logo e de descrição pra sua loja.',
        whatsapp ? (
          <>
            Te avisa no WhatsApp{' '}
            <strong className="font-semibold whitespace-nowrap">{formatWhatsapp(whatsapp)}</strong>{' '}
            em até 24 horas.
          </>
        ) : (
          'Te avisa no WhatsApp em até 24 horas.'
        ),
      ],
    },
    {
      id: 'voce',
      title: 'Você, enquanto isso',
      accent: false,
      items: [
        'Fica de olho no WhatsApp: a próxima escolha é sua.',
        // Só pra quem tem o curso, e já com o caminho até ele.
        ...(products.includes('sll')
          ? [
              <>
                Pode começar o curso pela{' '}
                <Link
                  href="/sll"
                  className="font-semibold text-link underline-offset-4 hover:underline"
                >
                  trilha de boas-vindas do SLL
                </Link>
                .
              </>,
            ]
          : []),
      ],
    },
  ];

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <Logo expression="happy" />
        <CardHeading
          title={name ? `Pronto, ${name}! Agora é com a gente.` : 'Pronto! Agora é com a gente.'}
          description="Recebemos as suas respostas."
        />
      </div>
      {groups.map((group) => (
        <section
          key={group.id}
          aria-labelledby={`proximos-${group.id}`}
          className="flex flex-col gap-3 rounded-card bg-card px-6 py-5 shadow-card forced-colors:border forced-colors:border-[CanvasText]"
        >
          <h2
            id={`proximos-${group.id}`}
            className="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
          >
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
        <Link href="/loja-pronta">Voltar pra Loja Pronta</Link>
      </Button>
    </PageShell>
  );
}
