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
          return (
            <section key={group.key} aria-labelledby={`resource-group-${group.key}`}>
              <div className="mb-4 flex items-center gap-3">
                <Icon aria-hidden="true" className="size-6 shrink-0 text-link" />
                <h2
                  id={`resource-group-${group.key}`}
                  className="text-title font-semibold text-foreground"
                >
                  {group.title}
                </h2>
              </div>
              <ul
                className={
                  isCalculator ? 'flex flex-col gap-4' : 'grid items-start gap-4 md:grid-cols-2'
                }
              >
                {group.items.map((resource) => {
                  const buttonLabel = resource.buttonLabel ?? 'Abrir recurso';
                  return (
                    <li
                      key={resource.id}
                      className={`${panelCard} ${isCalculator ? 'gap-4 sm:flex-row sm:items-center' : 'gap-3'}`}
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-link">
                        <Icon aria-hidden="true" className="size-6" />
                      </span>
                      <div className="min-w-0 flex-1">
                        {/* A calculadora também tem título: sem ele, o cartão não tinha nome
                            pro leitor de tela, só a descrição e o "Em breve". */}
                        <h3 className="text-body font-semibold text-balance text-foreground">
                          {resource.title}
                        </h3>
                        <p className="mt-1 text-body text-pretty text-muted-foreground">
                          {resource.description}
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
