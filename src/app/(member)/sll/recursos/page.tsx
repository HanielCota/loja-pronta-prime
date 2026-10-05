import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Calculator, Lightbulb, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaShell, panelCard } from '@/features/member/components/area-shell';
import { getSllPublishedResources } from '@/features/sll/server/catalog';
import { requireProduct } from '@/features/products/server/access';

export const metadata: Metadata = { title: 'Recursos · SLL' };

const ICONS = { calculadora: Calculator, assistentes: Lightbulb, parceiros: Store } as const;

export default async function SllResourcesPage() {
  const [{ session, products }, resources] = await Promise.all([
    requireProduct('sll'),
    getSllPublishedResources(),
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
    <AreaShell
      account={session.user}
      hasChoice={products.length > 1}
      area="sll"
      title="Recursos"
      intro="Ferramentas, parceiros e materiais que aceleram sua jornada."
    >
      <div className="flex flex-col gap-7">
        {groups.map((group) => {
          const Icon = ICONS[group.key as keyof typeof ICONS] ?? Lightbulb;
          return (
            <section key={group.key} aria-labelledby={`resource-group-${group.key}`}>
              <h2
                id={`resource-group-${group.key}`}
                className="mb-3 text-title font-semibold text-foreground"
              >
                {group.title}
              </h2>
              <ul className="grid gap-4 md:grid-cols-2">
                {group.items.map((resource) => (
                  <li key={resource.id} className={panelCard}>
                    <Icon aria-hidden="true" className="size-6 text-link" />
                    <h3 className="text-title font-semibold text-foreground">{resource.title}</h3>
                    <p className="flex-1 text-body text-muted-foreground">{resource.description}</p>
                    {resource.destination ? (
                      <Button asChild className="mt-2" variant="soft">
                        {resource.destination.startsWith('/') ? (
                          <Link href={resource.destination}>
                            {resource.buttonLabel ?? 'Abrir recurso'}{' '}
                            <ArrowUpRight aria-hidden="true" />
                          </Link>
                        ) : (
                          <a href={resource.destination} rel="noreferrer" target="_blank">
                            {resource.buttonLabel ?? 'Abrir recurso'}{' '}
                            <ArrowUpRight aria-hidden="true" />
                          </a>
                        )}
                      </Button>
                    ) : (
                      <p className="mt-2 text-body text-muted-foreground">Em breve</p>
                    )}
                  </li>
                ))}
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
    </AreaShell>
  );
}
