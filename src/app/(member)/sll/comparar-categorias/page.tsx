import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRightIcon, ScaleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { panelCard } from '@/features/member/components/area-shell';
import { SllFlashMessage } from '@/features/sll/components/sll-flash-message';
import { requireProduct } from '@/features/products/server/access';
import { SllAreaShell } from '@/features/sll/sll-area-shell';
import { readStoreObservations } from '@/features/assistant/server/metrics';
import { readCategoryExperiments } from '@/features/assistant/server/experiments';
import { createCategoryExperiment } from '@/features/assistant/server/experiment-actions';
import { getParam, type SearchParams } from '@/lib/search-params';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Comparar categorias · SLL' };

// O que falta pra comparação abrir, na ordem em que a aluna resolve.
const REQUIREMENTS = [
  'Conectar sua loja',
  'Esperar a primeira coleta de dados',
  'Ter dois anúncios em categorias diferentes',
];

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
  // Nome do anúncio no lugar do código; sem coleta daquele anúncio, fica o código mesmo.
  const titleById = new Map(data.items.map((item) => [String(item.itemId), item.title]));
  const listingName = (itemId: unknown) =>
    titleById.get(String(itemId)) ?? `Anúncio ${String(itemId)}`;
  return (
    <SllAreaShell
      account={session.user}
      hasChoice={products.length > 1}
      title="Comparar categorias"
      intro="Veja qual de dois anúncios foi melhor no mesmo período."
    >
      <Button
        asChild
        variant="link"
        className="min-h-11 w-auto self-start px-0 text-body font-semibold"
      >
        <Link href="/sll/anuncios">
          Ajustar anúncios da minha loja
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      </Button>
      {result ? (
        <SllFlashMessage
          failed={result !== 'saved'}
          message={
            result === 'saved'
              ? 'Comparação iniciada. Uma nova coleta mostrará o resultado do período.'
              : result === 'unavailable'
                ? 'Escolha anúncios com dados disponíveis e categorias diferentes.'
                : 'Confira os campos.'
          }
        />
      ) : null}
      {new Set(eligible.map((item) => item.categoryId)).size >= 2 ? (
        <section className={panelCard} aria-labelledby="category-selection">
          <h2 id="category-selection" className="text-title font-semibold">
            Escolha os anúncios
          </h2>
          <p className="text-body text-muted-foreground">
            Esta ferramenta compara os resultados observados. Ela não duplica anúncios nem troca
            categorias. Categorias e anúncios precisam seguir as regras da Shopee.
          </p>
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
        </section>
      ) : (
        <section className={cn(panelCard, 'gap-6')} aria-labelledby="category-requirements">
          <div className="flex flex-col gap-2">
            <h2 id="category-requirements" className="text-title font-semibold">
              Antes de comparar
            </h2>
            <p className="text-body text-pretty text-muted-foreground">
              A comparação só lê os resultados. Ela não muda seus anúncios nem as categorias.
            </p>
          </div>
          <ol className="flex flex-col gap-3">
            {REQUIREMENTS.map((requirement, index) => (
              <li key={requirement} className="flex gap-3 text-body text-pretty">
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-link forced-colors:border forced-colors:border-[CanvasText]"
                >
                  {index + 1}
                </span>
                <span className="pt-0.5">{requirement}</span>
              </li>
            ))}
          </ol>
          <Button asChild>
            <Link href="/sll/plano">Conferir dados da loja</Link>
          </Button>
        </section>
      )}
      {experiments.length ? (
        <section className={panelCard} aria-labelledby="category-results">
          <h2 id="category-results" className="text-title font-semibold">
            Suas comparações
          </h2>
          <ul className="space-y-4">
            {experiments.map((experiment) => (
              <li key={experiment.id} className="rounded-2xl border border-border p-4">
                <p className="text-body font-semibold">
                  {listingName(experiment.leftItemId)} e {listingName(experiment.rightItemId)}
                </p>
                <p className="mt-2 text-body text-muted-foreground">{experiment.result.message}</p>
                {experiment.result.source ? (
                  <p className="mt-2 text-body text-muted-foreground">
                    Fonte: {experiment.result.source}. Período:{' '}
                    {new Date(experiment.result.start!).toLocaleString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                    })}{' '}
                    a{' '}
                    {new Date(experiment.result.end!).toLocaleString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                    })}
                    .
                  </p>
                ) : null}
                {experiment.result.leftCtr != null && experiment.result.rightCtr != null ? (
                  <p className="mt-2 text-body">
                    Taxa de cliques:{' '}
                    {(experiment.result.leftCtr * 100).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2,
                    })}
                    % no primeiro anúncio e{' '}
                    {(experiment.result.rightCtr * 100).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2,
                    })}
                    % no segundo.
                  </p>
                ) : null}
                {experiment.result.preferredItemId ? (
                  <p className="mt-2 text-body">
                    Mais visualizações observadas: {listingName(experiment.result.preferredItemId)}.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section
          className={cn(panelCard, 'items-center gap-3 py-10 text-center')}
          aria-labelledby="category-results"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <ScaleIcon aria-hidden="true" className="size-6" />
          </span>
          <h2 id="category-results" className="text-body font-semibold">
            Suas comparações
          </h2>
          <p className="text-body text-pretty text-muted-foreground">
            As comparações que você começar aparecem aqui.
          </p>
        </section>
      )}
    </SllAreaShell>
  );
}
