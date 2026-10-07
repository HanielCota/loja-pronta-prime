import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requireProduct } from '@/features/products/server/access';
import { panelCard } from '@/features/member/components/area-shell';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { getSllPublishedResources } from '@/features/sll/server/catalog';
import { ASSISTANT_GUIDES } from '@/features/sll/tools/catalog';
import { cn } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = Object.hasOwn(ASSISTANT_GUIDES, slug) ? ASSISTANT_GUIDES[slug] : undefined;
  return { title: guide ? `${guide.title} · SLL` : 'Assistentes · SLL' };
}

export default async function AssistantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = Object.hasOwn(ASSISTANT_GUIDES, slug) ? ASSISTANT_GUIDES[slug] : undefined;
  if (!guide) notFound();
  const [{ session, products }, resources] = await Promise.all([
    requireProduct('sll', `/sll/recursos/assistentes/${slug}`),
    getSllPublishedResources(),
  ]);
  const resource = resources.find((item) => item.slug === slug);
  if (!resource?.destination) notFound();
  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title={resource.title}
      intro="Prepare as informações e abra seu assistente no ChatGPT."
      currentSection="/sll/recursos"
      backLink={{ href: '/sll/recursos', label: 'Voltar aos recursos' }}
    >
      <section className={cn(panelCard, 'gap-4')}>
        <h2 className="text-xl font-semibold text-foreground">Como usar</h2>
        <ol className="ml-6 list-decimal space-y-3 text-body text-foreground">
          {guide.instructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ol>
        <label htmlFor="assistant-prompt" className="text-body font-semibold text-foreground">
          Texto para você copiar e completar
        </label>
        <textarea
          id="assistant-prompt"
          readOnly
          defaultValue={guide.prompt}
          className="min-h-44 w-full rounded-field border border-input bg-background px-4 py-3 text-body text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        />
        <p className="text-sm text-muted-foreground">
          Troque as partes entre colchetes pelas informações da sua loja. O assistente abre em outra
          aba; o ChatGPT pode pedir que você entre na sua conta.
        </p>
        <Button asChild>
          <a href={resource.destination} target="_blank" rel="noreferrer">
            {resource.buttonLabel ?? 'Abrir no ChatGPT'}
            <ArrowUpRight aria-hidden="true" />
            <span className="sr-only"> (abre em outra aba)</span>
          </a>
        </Button>
      </section>
    </SllAreaShell>
  );
}
