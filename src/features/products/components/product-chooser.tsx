import { ArrowRightIcon } from 'lucide-react';
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
  /** Produto que leva o botão cheio. Sem ele, vale a última área aberta (ou o primeiro). */
  primary?: ProductId | undefined;
};

/**
 * Escolha da área, pra quem tem os dois produtos: um cartão por produto, lado a lado no
 * computador e um embaixo do outro no celular. Cada cartão é um link de verdade (abre em outra
 * aba, funciona sem JavaScript) com área de toque grande; só um leva o botão cheio, pra ficar
 * claro por onde seguir.
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
    <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6">
      {ordered.map((product) => {
        const { title, tag, pitch, path } = PRODUCTS[product];
        const current = status?.[product];
        const isMain = product === main;
        const verb = current?.cta ?? (product === lastArea ? 'Continuar' : 'Entrar');
        const id = `produto-${product}`;
        return (
          <li key={product} className="flex">
            <Link
              href={path}
              aria-label={`${verb}, ${title}`}
              aria-describedby={[
                isMain && `${id}-recomendado`,
                `${id}-tag`,
                !current?.detail && `${id}-resumo`,
                current && `${id}-andamento`,
              ]
                .filter(Boolean)
                .join(' ')}
              className="group/product flex flex-1 flex-col gap-5 rounded-card border border-transparent bg-card p-6 text-left shadow-card transition-transform duration-100 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:scale-[0.98] motion-reduce:active:scale-100 sm:p-8 forced-colors:border-[CanvasText]"
            >
              <span className="flex flex-col gap-1">
                {isMain ? (
                  <span id={`${id}-recomendado`} className="sr-only">
                    Recomendado agora.
                  </span>
                ) : null}
                <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
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
                  'mt-auto inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-transparent text-body font-semibold transition-colors duration-100',
                  isMain
                    ? 'bg-primary text-primary-foreground group-hover/product:bg-primary-hover forced-colors:border-[LinkText]'
                    : 'bg-primary-soft text-link forced-colors:border-[CanvasText]',
                )}
              >
                {verb}
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

/** Um traço por etapa (os feitos e o atual em verde, como o caminho da loja), a etapa atual e o que acontece nela. */
function StatusBlock({ caption, label, bar, detail, id }: ProductStatus & { id: string }) {
  return (
    <span id={id} className="flex flex-col gap-2">
      {bar ? (
        <span aria-hidden="true" className="flex gap-1">
          {Array.from({ length: bar.total }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-full border border-transparent',
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
