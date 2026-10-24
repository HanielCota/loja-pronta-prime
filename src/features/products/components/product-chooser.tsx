import { ArrowRightIcon, ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import type { ProductId } from '@/config/products';
import { cn } from '@/lib/utils';
import { PRODUCTS } from '../catalog';
import type { ProductStatus } from '../chooser';

/** Ordem na escolha: a Loja Pronta vem primeiro (a fase 1 dela depende da aluna). */
const ORDER: ProductId[] = ['loja-pronta', 'sll'];

type ProductChooserProps = {
  products: ProductId[];
  /**
   * Última área aberta: o bloco dela diz "Continuar" em vez de "Entrar" (a não ser que o
   * andamento traga o próprio texto do botão).
   */
  lastArea?: ProductId | undefined;
  /** Andamento de cada produto (quando há), mostrado no bloco dele. */
  status?: Partial<Record<ProductId, ProductStatus>> | undefined;
  /** Produto recomendado (dito ao leitor de tela). Sem ele, vale a última área aberta (ou o primeiro). */
  primary?: ProductId | undefined;
};

/**
 * Escolha da área, pra quem tem os dois produtos: um cartão por produto, lado a lado no
 * computador e um embaixo do outro no celular. O cartão é um link de verdade (abre em outra aba,
 * funciona sem JavaScript); quando tem uma ação secundária, os dois links ficam separados dentro
 * do mesmo cartão.
 *
 * Leitor de tela: o link se chama pelo que faz ("Entrar, Loja Pronta") e o resto do cartão vira
 * a descrição, pra o nome continuar curto. O nome do produto é um título, pra quem navega
 * por títulos. No alto contraste do Windows (forced-colors), as cores de fundo somem: as bordas
 * transparentes desenham o cartão e o botão, e a barra de etapas usa as cores do sistema.
 */
export function ProductChooser({ products, lastArea, status, primary }: ProductChooserProps) {
  const ordered = ORDER.filter((product) => products.includes(product));
  const main = primary ?? lastArea ?? ordered[0];
  return (
    <ul className={cn('grid gap-4', ordered.length > 1 && 'sm:grid-cols-2 sm:gap-6')}>
      {ordered.map((product) => {
        const { title, tag, pitch, path } = PRODUCTS[product];
        const current = status?.[product];
        const isMain = product === main;
        const verb = current?.cta ?? (product === lastArea ? 'Continuar' : 'Entrar');
        const id = `produto-${product}`;
        const description = [
          isMain && `${id}-recomendado`,
          `${id}-tag`,
          !current?.detail && `${id}-resumo`,
          current && `${id}-andamento`,
        ]
          .filter(Boolean)
          .join(' ');
        const content = (
          <>
            <span className="flex flex-col gap-1">
              {isMain ? (
                <span id={`${id}-recomendado`} className="sr-only">
                  Recomendado agora.
                </span>
              ) : null}
              <h2 className="text-headline font-semibold text-foreground">{title}</h2>
              <span id={`${id}-tag`} className="text-body text-muted-foreground">
                {tag}
              </span>
              {current?.detail ? null : (
                <span id={`${id}-resumo`} className="text-body text-pretty text-muted-foreground">
                  {pitch}
                </span>
              )}
            </span>
            {current ? <StatusBlock {...current} id={`${id}-andamento`} /> : null}
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-transparent bg-primary text-body font-semibold text-primary-foreground transition-colors duration-100 group-hover/product:bg-primary-hover forced-colors:border-[LinkText]',
                product === 'sll' ? 'mt-10' : 'mt-auto',
              )}
            >
              {verb}
              <ArrowRightIcon
                aria-hidden="true"
                className="size-5 transition-transform duration-150 ease-out group-hover/product:translate-x-0.5 motion-reduce:transition-none"
              />
            </span>
          </>
        );
        return (
          <li key={product} className="flex">
            {current?.secondaryAction ? (
              <div className="flex flex-1 flex-col rounded-card border border-transparent bg-card p-6 text-left shadow-card sm:p-8 forced-colors:border-[CanvasText]">
                <Link
                  href={path}
                  aria-label={`${verb}, ${title}`}
                  aria-describedby={description}
                  className="group/product flex flex-1 flex-col gap-5 rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  {content}
                </Link>
                <Link
                  href={current.secondaryAction.href}
                  className="group/back -mx-2 mt-2 inline-flex min-h-11 items-center gap-1 self-start rounded-full px-2 font-semibold text-link outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                >
                  <ChevronLeftIcon
                    aria-hidden="true"
                    className="size-4 motion-safe:transition-transform motion-safe:group-hover/back:-translate-x-0.5"
                  />
                  <span className="text-left underline-offset-4 group-hover/back:underline">
                    {current.secondaryAction.label}
                  </span>
                </Link>
              </div>
            ) : (
              <Link
                href={path}
                aria-label={`${verb}, ${title}`}
                aria-describedby={description}
                className="group/product flex flex-1 flex-col gap-5 rounded-card border border-transparent bg-card p-6 text-left shadow-card transition-transform duration-100 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.98] motion-reduce:active:scale-100 sm:p-8 forced-colors:border-[CanvasText]"
              >
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Um traço por etapa (os feitos e o atual em verde, como o caminho da loja), a etapa atual e o que acontece nela. */
function StatusBlock({ caption, label, bar, detail, id }: ProductStatus & { id: string }) {
  return (
    <span id={id} className="flex flex-col gap-2">
      {bar ? (
        <span aria-hidden="true" className="flex gap-1.5">
          {Array.from({ length: bar.total }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-2.5 flex-1 rounded-full border border-transparent',
                index < bar.step
                  ? 'bg-progress forced-colors:bg-[CanvasText]'
                  : 'border-input bg-progress-track forced-colors:border-[CanvasText]',
              )}
            />
          ))}
        </span>
      ) : null}
      <span className="flex flex-col">
        {caption ? <span className="text-sm text-muted-foreground">{caption}</span> : null}
        <span className="text-body font-semibold text-foreground">{label}</span>
      </span>
      {detail ? (
        <span className="text-body text-pretty text-muted-foreground">{detail}</span>
      ) : null}
    </span>
  );
}
