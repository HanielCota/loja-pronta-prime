import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SelectMenu } from '@/components/ui/select-menu';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { panelCard } from '@/features/member/components/area-shell';
import { SllFlashMessage } from '@/features/sll/components/sll-flash-message';
import { requireProduct } from '@/features/products/server/access';
import { SllPage } from '@/features/sll/sll-area-shell';
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
  const hasTwoCategories = new Set(eligible.map((item) => item.categoryId)).size >= 2;
  // O que falta, na ordem em que acontece; cada passo vem dos dados, nunca marcado à toa.
  const requirements = [
    { label: 'Conectar sua loja', done: data.status !== 'unavailable' },
    { label: 'Esperar a primeira coleta de dados', done: data.status === 'ready' },
    { label: 'Ter dois anúncios em categorias diferentes', done: hasTwoCategories },
  ];
  // Nome do anúncio no lugar do código; sem coleta daquele anúncio, fica o código mesmo.
  const titleById = new Map(data.items.map((item) => [String(item.itemId), item.title]));
  const listingName = (itemId: unknown) =>
    titleById.get(String(itemId)) ?? `Anúncio ${String(itemId)}`;
  return (
    <SllPage
      hasChoice={products.length > 1}
      title="Comparar categorias"
      intro="Veja qual de dois anúncios foi melhor no mesmo período."
    >
      <Link
        href="/sll/anuncios"
        className="-mt-2 flex min-h-11 w-fit items-center gap-1.5 rounded-full text-body font-semibold text-link outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
      >
        Ajustar anúncios da minha loja <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
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
      <section className={cn(panelCard, 'gap-2')} aria-labelledby="category-selection">
        <h2 id="category-selection" className="text-title font-semibold">
          {hasTwoCategories ? 'Escolha os anúncios' : 'Antes de comparar'}
        </h2>
        <p className="text-body text-pretty text-muted-foreground">
          A comparação só lê os resultados. Ela não muda seus anúncios nem as categorias.
        </p>
        {hasTwoCategories ? (
          <form action={createCategoryExperiment} className="mt-4 flex flex-col gap-4">
            {[
              ['left', 'Primeiro anúncio'],
              ['right', 'Segundo anúncio'],
            ].map(([name, label]) => (
              <label key={name} className="flex flex-col gap-2 text-body">
                {label}
                <SelectMenu name={name} required defaultValue="">
                  <option value="" disabled>
                    Escolha um anúncio
                  </option>
                  {eligible.map((item) => (
                    <option value={item.itemId} key={item.itemId}>
                      {item.title} · Categoria {item.categoryId}
                    </option>
                  ))}
                </SelectMenu>
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
            <ol className="mt-3 flex flex-col">
              {requirements.map((requirement, index) => (
                <li key={requirement.label} className="flex min-h-11 items-center gap-3 text-body">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold',
                      requirement.done
                        ? 'bg-progress text-primary-foreground'
                        : 'bg-primary-soft text-link',
                    )}
                  >
                    {requirement.done ? <Check className="size-4" strokeWidth={3} /> : index + 1}
                  </span>
                  {requirement.label}
                  <span className="sr-only">{requirement.done ? ' (feito)' : ' (falta)'}</span>
                </li>
              ))}
            </ol>
            <Button asChild className="mt-4">
              <Link href="/sll/plano">Conferir dados da loja</Link>
            </Button>
          </>
        )}
      </section>
      {experiments.length ? (
        <section className={cn(panelCard, 'gap-3')} aria-labelledby="category-results">
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
        // Sem comparações: um convite curto, centralizado, em vez de uma lista vazia.
        <section
          className={cn(panelCard, 'items-center gap-2 text-center')}
          aria-labelledby="category-results"
        >
          <span
            aria-hidden="true"
            className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"
          >
            <Scale className="size-6" />
          </span>
          <h2 id="category-results" className="mt-1 text-body font-semibold">
            Suas comparações
          </h2>
          <p className="text-body text-pretty text-muted-foreground">
            As comparações que você começar aparecem aqui.
          </p>
        </section>
      )}
    </SllPage>
  );
}
