import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { requireProduct } from '@/features/products/server/access';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { getSllPublishedResources } from '@/features/sll/server/catalog';
import { CalculatorForm } from '@/features/sll/tools/components/calculator-form';
import { CALCULATORS } from '@/features/sll/tools/catalog';
import { SHOPEE_FEES } from '@/features/sll/tools/fees';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  const calculator = Object.hasOwn(CALCULATORS, tool) ? CALCULATORS[tool] : undefined;
  return { title: calculator ? `${calculator.title} · SLL` : 'Calculadoras · SLL' };
}

export default async function CalculatorPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const calculator = Object.hasOwn(CALCULATORS, tool) ? CALCULATORS[tool] : undefined;
  if (!calculator) notFound();
  const [{ session, products }, resources] = await Promise.all([
    requireProduct('sll', `/sll/recursos/${tool}`),
    getSllPublishedResources(),
  ]);
  if (!resources.some((resource) => resource.slug === calculator.slug)) notFound();
  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title={calculator.title}
      intro={calculator.intro}
      currentSection="/sll/recursos"
      backLink={{ href: '/sll/recursos', label: 'Voltar aos recursos' }}
    >
      <div className="flex flex-col gap-6">
        <CalculatorForm kind={calculator.kind} permalink={`/sll/recursos/${tool}`} />
        <p className="text-sm text-muted-foreground">
          Taxas automáticas em vigor desde {SHOPEE_FEES.effectiveAt}, conferidas em{' '}
          {SHOPEE_FEES.checkedAt}.{' '}
          <a
            className="text-link underline underline-offset-4"
            href={SHOPEE_FEES.source}
            target="_blank"
            rel="noreferrer"
          >
            Ver política oficial da Shopee (nova aba)
          </a>
          . Se sua loja tiver condições diferentes, selecione taxas personalizadas. Impostos e
          campanhas são informados por você.
        </p>
        <Button asChild variant="soft" size="inline">
          <Link href="/sll/recursos/materiais">Guia e planilha de custos</Link>
        </Button>
      </div>
    </SllAreaShell>
  );
}
