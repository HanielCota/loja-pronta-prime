import type { Metadata } from 'next';
import { panelCard } from '@/features/member/components/area-shell';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { getSllPublishedResources } from '@/features/sll/server/catalog';
import { getSllCopy } from '@/features/sll/server/copy';
import { requireProduct } from '@/features/products/server/access';
import { resourceHref } from '@/features/sll/tools/catalog';
import {
  SllGroupTitle,
  SllGroupedList,
  SllListRow,
} from '@/features/sll/components/sll-grouped-list';
import { SllResourceIcon } from '@/features/sll/components/sll-resource-icon';

export const metadata: Metadata = { title: 'Recursos · SLL' };

const GROUP_ORDER = ['calculadora', 'materiais', 'assistentes', 'parceiros'];

/**
 * Ferramentas por categoria, em listas agrupadas: a linha inteira abre a ferramenta. Os nomes, as
 * frases e os grupos vêm do admin; ferramenta sem endereço aparece como "Em breve".
 */
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
      if (!group) {
        result.push({ key: resource.groupKey, title: resource.groupTitle, items: [resource] });
      }
      return result;
    },
    [],
  );
  groups.sort((left, right) => GROUP_ORDER.indexOf(left.key) - GROUP_ORDER.indexOf(right.key));

  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title={copy.resourcesTitle}
      intro={copy.resourcesIntro}
    >
      {groups.length ? (
        <div className="grid items-start gap-8 lg:grid-cols-2">
          {groups.map((group) => (
            <section
              key={group.key}
              aria-labelledby={`resource-group-${group.key}`}
              className="flex flex-col gap-3"
            >
              <SllGroupTitle id={`resource-group-${group.key}`}>{group.title}</SllGroupTitle>
              <SllGroupedList>
                {group.items.map((resource) => {
                  const href = resourceHref(resource);
                  return (
                    <SllListRow
                      key={resource.id}
                      href={href}
                      icon={<SllResourceIcon slug={resource.slug} groupKey={resource.groupKey} />}
                      title={resource.title}
                      detail={resource.description}
                      badge={href ? null : 'Em breve'}
                    />
                  );
                })}
              </SllGroupedList>
            </section>
          ))}
        </div>
      ) : (
        <section className={panelCard}>
          <p className="text-body text-muted-foreground">
            Os recursos ainda não estão disponíveis.
          </p>
        </section>
      )}
    </SllAreaShell>
  );
}
