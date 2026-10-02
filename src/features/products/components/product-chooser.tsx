import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import type { ProductId } from '@/config/products';
import { cn } from '@/lib/utils';
import { PRODUCTS } from '../catalog';
import { ProductIcon } from './product-icon';

/** Onde ela está num produto: a etapa atual de quantas, e isso por escrito ("Fase 3 de 7 · …"). */
export type ProductProgress = { step: number; total: number; label: string };

type ProductChooserProps = {
  products: ProductId[];
  /** Última área aberta: o bloco dela diz "Continuar" em vez de "Entrar". */
  lastArea?: ProductId;
  /** Andamento de cada produto (quando há), mostrado no bloco dele. */
  progress?: Partial<Record<ProductId, ProductProgress>>;
};

/**
 * Escolha da área, pra quem tem os dois produtos: um bloco por produto, lado a lado no
 * computador e deitados (ícone à esquerda) no celular. Cada bloco é um link de verdade (abre em
 * outra aba, funciona sem JavaScript) com área de toque grande.
 */
export function ProductChooser({ products, lastArea, progress }: ProductChooserProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {products.map((product) => {
        const { title, tag, pitch, path } = PRODUCTS[product];
        const isLast = product === lastArea;
        const status = progress?.[product];
        return (
          <li key={product} className="flex">
            <Link
              href={path}
              className="group/product flex flex-1 gap-4 rounded-2xl border border-border p-4 text-left transition-[background-color,transform] duration-100 ease-out outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.98] motion-reduce:active:scale-100 sm:flex-col sm:p-5"
            >
              <ProductIcon product={product} />
              <span className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                  {tag}
                </span>
                <span className="text-body font-semibold text-foreground">{title}</span>
                <span className="text-sm text-pretty text-muted-foreground">{pitch}</span>
                {status ? <ProgressLine {...status} /> : null}
                <span className="mt-auto inline-flex items-center gap-1 self-end pt-2 text-sm font-semibold text-primary">
                  {isLast ? 'Continuar' : 'Entrar'}
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="size-4 transition-transform duration-150 ease-out group-hover/product:translate-x-0.5 motion-reduce:transition-none"
                  />
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Um traço por etapa (os feitos e o atual em azul) e, abaixo, a etapa atual por escrito. */
function ProgressLine({ step, total, label }: ProductProgress) {
  return (
    <span className="mt-2 flex flex-col gap-1.5">
      <span aria-hidden="true" className="flex gap-1">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn('h-1 flex-1 rounded-full', index < step ? 'bg-primary' : 'bg-border')}
          />
        ))}
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </span>
  );
}
