import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import type { ProductId } from '@/config/products';
import { cn } from '@/lib/utils';
import { PRODUCTS } from '../catalog';
import { ProductIcon } from './product-icon';

/** Ordem na escolha: a Loja Pronta vem primeiro (a fase 1 dela depende da aluna). */
const ORDER: ProductId[] = ['loja-pronta', 'sll'];

/**
 * Onde ela está num produto: a linha principal ("Fase 3 de 7 · …"), a barra de etapas (quando
 * há) e o que acontece agora. Com `detail`, o bloco troca o resumo do produto por ele: quem já
 * comprou precisa saber o que vem a seguir, não o que o produto é.
 */
export type ProductStatus = {
  label: string;
  bar?: { step: number; total: number };
  detail?: string;
};

type ProductChooserProps = {
  products: ProductId[];
  /** Última área aberta: o bloco dela diz "Continuar" em vez de "Entrar". */
  lastArea?: ProductId;
  /** Andamento de cada produto (quando há), mostrado no bloco dele. */
  status?: Partial<Record<ProductId, ProductStatus>>;
  /** Produto que leva o botão cheio. Sem ele, vale a última área aberta (ou o primeiro). */
  primary?: ProductId;
};

/**
 * Escolha da área, pra quem tem os dois produtos: um cartão por produto, lado a lado no
 * computador e um embaixo do outro no celular. Cada cartão é um link de verdade (abre em outra
 * aba, funciona sem JavaScript) com área de toque grande; só um leva o botão cheio, pra ficar
 * claro por onde seguir.
 */
export function ProductChooser({ products, lastArea, status, primary }: ProductChooserProps) {
  const ordered = ORDER.filter((product) => products.includes(product));
  const main = primary ?? lastArea ?? ordered[0];
  return (
    <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6">
      {ordered.map((product) => {
        const { title, tag, pitch, path } = PRODUCTS[product];
        const current = status?.[product];
        const isMain = product === main;
        return (
          <li key={product} className="flex">
            <Link
              href={path}
              className="group/product flex flex-1 flex-col gap-5 rounded-card bg-card p-6 text-left shadow-card transition-transform duration-100 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.98] motion-reduce:active:scale-100 sm:p-8"
            >
              <ProductIcon product={product} />
              <span className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  {tag}
                </span>
                <span className="text-xl font-semibold tracking-tight text-foreground">
                  {title}
                </span>
                {current?.detail ? null : (
                  <span className="text-body text-pretty text-muted-foreground">{pitch}</span>
                )}
              </span>
              {current ? <StatusBlock {...current} /> : null}
              <span
                className={cn(
                  'mt-auto inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-body font-semibold transition-colors duration-100',
                  isMain
                    ? 'bg-primary text-primary-foreground group-hover/product:bg-primary-hover'
                    : 'bg-primary-soft text-link',
                )}
              >
                {product === lastArea ? 'Continuar' : 'Entrar'}
                <ArrowRightIcon
                  aria-hidden="true"
                  className="size-5 transition-transform duration-150 ease-out group-hover/product:translate-x-0.5 motion-reduce:transition-none"
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Um traço por etapa (os feitos e o atual em azul), a etapa atual e o que acontece nela. */
function StatusBlock({ label, bar, detail }: ProductStatus) {
  return (
    <span className="flex flex-col gap-2">
      {bar ? (
        <span aria-hidden="true" className="flex gap-1">
          {Array.from({ length: bar.total }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                index < bar.step ? 'bg-primary' : 'bg-border',
              )}
            />
          ))}
        </span>
      ) : null}
      <span className="text-body font-semibold text-foreground">{label}</span>
      {detail ? (
        <span className="text-body text-pretty text-muted-foreground">{detail}</span>
      ) : null}
    </span>
  );
}
