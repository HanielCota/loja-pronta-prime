import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { panelCard } from '@/features/member/components/area-shell';
import { cn } from '@/lib/utils';
import {
  SllGroupTitle,
  SllGroupedList,
  SllListRow,
  SllRowIcon,
} from '@/features/sll/components/sll-grouped-list';
import { SllResourceIcon } from '@/features/sll/components/sll-resource-icon';
import type { SllStoreSummary } from '@/features/sll/store-overview';

/** A loja dela em uma linha: o nome, onde a montagem está e se a Shopee está conectada. */
export function SllStoreRow({
  summary,
  hasLojaPronta,
}: {
  summary: SllStoreSummary;
  hasLojaPronta: boolean;
}) {
  const title = summary.assembly?.name ?? 'Sua loja na Shopee';
  const detail = storeDetail(summary, hasLojaPronta);
  const badge = storeBadge(summary);

  return (
    <section aria-labelledby="sll-sua-loja" className="flex flex-col gap-3">
      <SllGroupTitle id="sll-sua-loja">Sua loja</SllGroupTitle>
      <SllGroupedList>
        <SllListRow
          href="/sll/minhas-lojas"
          icon={<ShoppingBag />}
          iconTone="shopee"
          title={title}
          detail={detail}
          badge={badge}
        />
      </SllGroupedList>
    </section>
  );
}

function storeDetail(summary: SllStoreSummary, hasLojaPronta: boolean): string {
  if (summary.failed) return 'Não deu pra carregar agora. Toque pra tentar de novo.';
  if (summary.assembly) return `Montagem: ${summary.assembly.phaseTitle}`;
  if (summary.connected) return 'Conectada. Veja os próximos passos.';
  if (hasLojaPronta) return 'Monte sua loja ou conecte uma que você já tem.';
  return 'Conecte sua loja pra acompanhar tudo por aqui.';
}

function storeBadge(summary: SllStoreSummary): string | null {
  if (summary.failed) return null;
  if (summary.connected) return 'Shopee conectada';
  return 'Shopee não conectada';
}

type ShortcutResource = {
  id: string;
  slug: string;
  groupKey: string;
  title: string;
  href: string | null;
};

/** As ferramentas que a aluna mais procura no começo, com o nome curto do que ela quer fazer. */
const FEATURED_TOOLS: Array<{ slug: string; label: string }> = [
  { slug: 'calculadora-preco-shopee', label: 'Calcular preço' },
  { slug: 'simulador-descontos', label: 'Simular desconto' },
  { slug: 'mentora-pri', label: 'Mentora Pri' },
  { slug: 'materiais-sll', label: 'Materiais' },
];

/**
 * Atalhos pras ferramentas mais usadas. Só entra o que está publicado e tem endereço: um atalho
 * nunca vira link quebrado. Todas as outras continuam em Recursos.
 */
export function SllToolShortcuts({ resources }: { resources: ShortcutResource[] }) {
  const tools = FEATURED_TOOLS.flatMap(({ slug, label }) => {
    const resource = resources.find((item) => item.slug === slug && item.href);
    return resource?.href ? [{ ...resource, href: resource.href, label }] : [];
  });
  if (!tools.length) return null;

  return (
    <section aria-labelledby="sll-ferramentas" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 px-2">
        <h2 id="sll-ferramentas" className="text-body font-semibold text-foreground">
          Ferramentas mais usadas
        </h2>
        <Link
          className="inline-flex min-h-11 items-center rounded-md text-body font-medium text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href="/sll/recursos"
        >
          Ver todas
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tools.map((tool) => (
          <li key={tool.id}>
            <Link
              className={cn(
                panelCard,
                'group h-full gap-3 p-4 outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.98] motion-safe:transition-colors motion-safe:duration-150 motion-reduce:active:scale-100 sm:p-4',
              )}
              href={tool.href}
            >
              <SllRowIcon>
                <SllResourceIcon slug={tool.slug} groupKey={tool.groupKey} />
              </SllRowIcon>
              <span className="text-body font-semibold text-balance text-foreground">
                {tool.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
