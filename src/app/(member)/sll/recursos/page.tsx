import type { Metadata } from 'next';
import { panelCard } from '@/features/member/components/area-shell';
import { SllPage } from '@/features/sll/sll-area-shell';
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
  const [{ products }, resources, copy] = await Promise.all([
    requireProduct('sll'),
    getSllPublishedResources(),
    getSllCopy(),
  ]);
  const groups = resources.reduce<Array<{ key: string; title: string; items: typeof resources }>>(
    (result, resource) => {
      const group = result.find((item) => item.key === resource.groupKey);
      if (group) {
        group.items.push(resource);
        return result;
      }
      result.push({ key: resource.groupKey, title: resource.groupTitle, items: [resource] });
      return result;
    },
    [],
  );
  groups.sort((left, right) => GROUP_ORDER.indexOf(left.key) - GROUP_ORDER.indexOf(right.key));

  return (
    <SllPage
      hasChoice={products.length > 1}
      title={copy.resourcesTitle}
      intro={copy.resourcesIntro}
    >
      {groups.length ? (
        // Colunas que se encaixam (como num mural): um grupo curto não deixa buraco ao lado do
        // grupo comprido. Cada grupo fica inteiro numa coluna.
        <div className="gap-8 lg:columns-2">
          {groups.map((group) => (
            <section
              key={group.key}
              aria-labelledby={`resource-group-${group.key}`}
              className="mb-8 flex break-inside-avoid flex-col gap-3 last:mb-0"
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
    </SllPage>
  );
}
