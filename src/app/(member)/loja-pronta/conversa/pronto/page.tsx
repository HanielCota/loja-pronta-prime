import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CardHeading } from '@/components/brand/card-heading';
import { Logo } from '@/components/brand/logo';
import { PageShell } from '@/components/brand/page-shell';
import { Button } from '@/components/ui/button';
import { getOnboarding } from '@/features/onboarding/server/conversation';
import { CONVERSATION_PATH, DONE_PATH } from '@/features/onboarding/steps';
import { firstName } from '@/features/products/names';
import { requireProduct } from '@/features/products/server/access';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Respostas enviadas',
};

const NEXT_STEPS = [
  {
    title: 'Nossa equipe, agora',
    items: [
      'Cria opções de logo e de descrição pra sua loja.',
      'Te avisa no WhatsApp em até 24 horas.',
    ],
    accent: true,
  },
  {
    title: 'Você, enquanto isso',
    items: [
      'Fica de olho no WhatsApp: a próxima escolha é sua.',
      'Se tiver o SLL, pode começar pela trilha de boas-vindas.',
    ],
    accent: false,
  },
];

/** Fim da conversa: o que acontece agora, de cada lado. */
export default async function ConversationDonePage() {
  const { session } = await requireProduct('loja-pronta', DONE_PATH);
  const { completedAt } = await getOnboarding(session.user.id);
  if (!completedAt) redirect(CONVERSATION_PATH);
  const name = firstName(session.user.name);

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <Logo expression="happy" />
        <CardHeading
          title={name ? `Pronto, ${name}! Agora é com a gente.` : 'Pronto! Agora é com a gente.'}
          description="Recebemos as suas respostas."
        />
      </div>
      {NEXT_STEPS.map((group) => (
        <section
          key={group.title}
          aria-labelledby={`proximos-${group.accent ? 'equipe' : 'voce'}`}
          className="flex flex-col gap-3 rounded-card bg-card px-6 py-5 shadow-card forced-colors:border forced-colors:border-[CanvasText]"
        >
          <h2
            id={`proximos-${group.accent ? 'equipe' : 'voce'}`}
            className="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
          >
            {group.title}
          </h2>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <li key={item} className="flex gap-3 text-body text-pretty">
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-2.5 size-2 shrink-0 rounded-full forced-colors:bg-[CanvasText]',
                    group.accent ? 'bg-primary' : 'bg-muted-foreground',
                  )}
                />
                {item}
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
