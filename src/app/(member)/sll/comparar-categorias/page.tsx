import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { panelCard } from '@/features/member/components/area-shell';
import { requireProduct } from '@/features/products/server/access';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { readStoreObservations } from '@/features/assistant/server/metrics';
import { readCategoryExperiments } from '@/features/assistant/server/experiments';
import { createCategoryExperiment } from '@/features/assistant/server/experiment-actions';
import { getParam, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Comparar categorias · SLL' };
export default async function CategoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session, products } = await requireProduct('sll', '/sll/comparar-categorias');
  const [data, experiments, params] = await Promise.all([
    readStoreObservations(session.user.id),
    readCategoryExperiments(session.user.id),
    searchParams,
  ]);
  const result = getParam(params.resultado);
  const eligible = data.items.filter((item) => item.categoryId);
  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title="Comparar categorias"
      intro="Acompanhe dois anúncios existentes e veja o que mudou no mesmo período."
    >
      {result ? (
        <output className="text-body">
          {result === 'saved'
            ? 'Comparação iniciada. Uma nova coleta mostrará o resultado do período.'
            : result === 'unavailable'
              ? 'Escolha anúncios com dados disponíveis e categorias diferentes.'
              : 'Confira os campos.'}
        </output>
      ) : null}
      <section className={panelCard} aria-labelledby="category-selection">
        <h2 id="category-selection" className="text-title font-semibold">
          Escolha os anúncios
        </h2>
        <p className="text-body text-muted-foreground">
          Esta ferramenta compara os resultados observados. Ela não duplica anúncios nem troca
          categorias. Categorias e anúncios precisam seguir as regras da Shopee.
        </p>
        {new Set(eligible.map((item) => item.categoryId)).size >= 2 ? (
          <form action={createCategoryExperiment} className="flex flex-col gap-4">
            {[
              ['left', 'Primeiro anúncio'],
              ['right', 'Segundo anúncio'],
            ].map(([name, label]) => (
              <label key={name} className="flex flex-col gap-2 text-body">
                {label}
                <Select name={name} required defaultValue="">
                  <option value="" disabled>
                    Escolha um anúncio
                  </option>
                  {eligible.map((item) => (
                    <option value={item.itemId} key={item.itemId}>
                      {item.title} · Categoria {item.categoryId}
                    </option>
                  ))}
                </Select>
              </label>
            ))}
            <FloatingLabelInput
              id="category-exposure"
              name="minViews"
              type="number"
              label="Mínimo de visualizações por anúncio"
              defaultValue="100"
              min={1}
              max={1_000_000}
              required
            />
            <p className="text-sm text-muted-foreground">
              Esse limite organiza a leitura. Ele não é uma garantia de diferença estatística ou de
              vendas.
            </p>
            <Button>Começar comparação</Button>
          </form>
        ) : (
          <>
            <p className="text-body text-muted-foreground">
              Precisamos de uma coleta com pelo menos dois anúncios de categorias diferentes.
            </p>
            <Button asChild variant="soft">
              <Link href="/sll/plano">Conferir dados da loja</Link>
            </Button>
          </>
        )}
      </section>
      <section className={panelCard} aria-labelledby="category-results">
        <h2 id="category-results" className="text-title font-semibold">
          Suas comparações
        </h2>
        {experiments.length ? (
          <ul className="space-y-4">
            {experiments.map((experiment) => (
              <li key={experiment.id} className="rounded-2xl border border-border p-4">
                <p className="text-body font-semibold">
                  Anúncios {experiment.leftItemId} e {experiment.rightItemId}
                </p>
                <p className="mt-2 text-body text-muted-foreground">{experiment.result.message}</p>
                {experiment.result.preferredItemId ? (
                  <p className="mt-2 text-body">
                    Mais visualizações observadas: anúncio {experiment.result.preferredItemId}.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-muted-foreground">Nenhuma comparação iniciada.</p>
        )}
      </section>
    </SllAreaShell>
  );
}
