import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Calculator, Lightbulb, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { panelCard } from '@/features/member/components/area-shell';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { getSllPublishedResources } from '@/features/sll/server/catalog';
import { getSllCopy } from '@/features/sll/server/copy';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = { title: 'Recursos · SLL' };

const ICONS = { calculadora: Calculator, assistentes: Lightbulb, parceiros: Store } as const;
const LEGACY_ACTIONS: Record<string, string> = {
  'mentora-pri': 'Conversar com a Pri',
  'artista-de-loja': 'Criar logo e descrição',
  'fotografo-profissional': 'Criar fotos do produto',
  'anuncio-lucrativo': 'Montar meu anúncio',
};

export default async function SllResourcesPage() {
  const [{ session, products }, resources, copy] = await Promise.all([
    requireProduct('sll'),
    getSllPublishedResources(),
    getSllCopy(),
  ]);
  const groups = resources.reduce<Array<{ key: string; title: string; items: typeof resources }>>(
    (result, resource) => {
      const group = result.find((item) => item.key === resource.groupKey);
      if (group) group.items.push(resource);
      else result.push({ key: resource.groupKey, title: resource.groupTitle, items: [resource] });
      return result;
    },
    [],
  );
  const groupOrder = ['calculadora', 'assistentes', 'parceiros'];
  groups.sort((left, right) => groupOrder.indexOf(left.key) - groupOrder.indexOf(right.key));

  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title={copy.resourcesTitle}
      intro={copy.resourcesIntro}
    >
      <div className="flex flex-col gap-9">
        {groups.map((group) => {
          const Icon = ICONS[group.key as keyof typeof ICONS] ?? Lightbulb;
          const isCalculator = group.key === 'calculadora';
          const groupTitle =
            group.title === 'GPTs personalizados SLL' ? 'Ajuda para sua loja' : group.title;
          return (
            <section key={group.key} aria-labelledby={`resource-group-${group.key}`}>
              <h2
                id={`resource-group-${group.key}`}
                className="mb-4 text-body font-semibold text-foreground"
              >
                {groupTitle}
              </h2>
              <ul
                className={
                  isCalculator
                    ? 'flex flex-col gap-4'
                    : 'grid auto-rows-fr items-stretch gap-4 md:grid-cols-2'
                }
              >
                {group.items.map((resource) => {
                  const title =
                    resource.title === 'Mentora Pri (Atendimento 24 horas)'
                      ? 'Mentora Pri'
                      : resource.title;
                  const description =
                    resource.slug === 'envio-velox' &&
                    resource.description ===
                      'Fornecedores curados para dropshipping Shopee. O endereço visto no site antigo não abriu.'
                      ? 'Fornecedores para sua loja na Shopee.'
                      : resource.description;
                  const buttonLabel =
                    resource.buttonLabel === 'Abrir GPT'
                      ? (LEGACY_ACTIONS[resource.slug] ?? 'Abrir ferramenta')
                      : (resource.buttonLabel ?? 'Abrir recurso');
                  return (
                    <li
                      key={resource.id}
                      className={`${panelCard} h-full ${isCalculator ? 'gap-4 sm:flex-row sm:items-center' : 'gap-3'}`}
                    >
                      <Icon aria-hidden="true" className="size-6 shrink-0 text-link" />
                      <div className="min-w-0 flex-1">
                        {!isCalculator ? (
                          <h3 className="text-body font-semibold text-balance text-foreground">
                            {title}
                          </h3>
                        ) : null}
                        <p className="mt-1 text-body text-pretty text-muted-foreground">
                          {description}
                        </p>
                      </div>
                      {resource.destination ? (
                        <Button
                          asChild
                          className={isCalculator ? 'sm:w-auto' : 'mt-auto'}
                          variant="soft"
                        >
                          {resource.destination.startsWith('/') ? (
                            <Link href={resource.destination}>
                              {buttonLabel} <ArrowUpRight aria-hidden="true" />
                            </Link>
                          ) : (
                            <a href={resource.destination} rel="noreferrer" target="_blank">
                              {buttonLabel} <ArrowUpRight aria-hidden="true" />
                            </a>
                          )}
                        </Button>
                      ) : (
                        <span className="mt-auto w-fit rounded-full border border-border bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
                          Em breve
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {!groups.length ? (
          <section className={panelCard}>
            <p className="text-body text-muted-foreground">
              Os recursos ainda não estão disponíveis.
            </p>
          </section>
        ) : null}
      </div>
    </SllAreaShell>
  );
}
