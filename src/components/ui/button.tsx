import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

// Resposta no instante do toque (active), não só ao soltar: encolhe levemente em 100ms.
// Carregando (aria-busy) não fica apagado: "Entrando…" é o único aviso da tela nesse momento, e
// a 60% o texto branco cairia pra 2,4:1. O spinner já diz que está esperando.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:pointer-events-none disabled:opacity-60 aria-disabled:not-aria-busy:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        // Alto contraste do Windows: o fundo some, a borda (da cor de botão do sistema) fica.
        // O halo do hover só tem cor no tema escuro, onde o roxo escurece com o mouse em cima.
        default:
          'rounded-full bg-primary text-body font-semibold text-primary-foreground transition-[background-color,box-shadow,transform] duration-100 ease-out hover:bg-primary-hover hover:shadow-halo active:scale-[0.97] motion-reduce:active:scale-100 forced-colors:border-2 forced-colors:border-[ButtonText]',
        /** Ação secundária ao lado (ou no lugar) da principal: mesmo formato, roxo contornado (fio e
         * fundo roxo bem leves), pra chamar a atenção sem competir com o botão principal. */
        soft: 'rounded-full border border-primary/55 bg-primary-soft text-body font-semibold text-link transition-[background-color,border-color,transform] duration-100 ease-out hover:border-primary hover:bg-primary/14 active:scale-[0.97] motion-reduce:active:scale-100 forced-colors:border-2 forced-colors:border-[ButtonText]',
        ghost:
          'rounded-full text-muted-foreground transition-[background-color,color,opacity] duration-100 hover:bg-muted hover:text-foreground active:opacity-60',
        link: 'rounded-md font-medium text-link underline-offset-4 transition-opacity duration-100 hover:underline active:opacity-60',
      },
      size: {
        // Altura mínima (não fixa) e quebra de linha: com zoom só de texto ou espaçamento de
        // texto maior (WCAG 1.4.12), um rótulo longo cresce o botão em vez de vazar dele.
        default: 'min-h-12 w-full px-6 py-2.5 text-center text-balance',
        icon: 'size-11',
        /** Link de texto com alvo de toque de 44px. */
        inline: 'h-auto min-h-11 px-0 whitespace-nowrap',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Mostra o indicador de carregamento e bloqueia novos cliques. */
    loading?: boolean;
    loadingText?: string;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingText,
  disabled,
  onClick,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      // Carregando: indisponível só pra tecnologia assistiva. `disabled` tiraria o foco de quem usa
      // teclado; cancelar o clique bloqueia o reenvio, inclusive pelo Enter num campo (o
      // navegador envia o formulário "clicando" no botão principal).
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={
        loading ? (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault() : onClick
      }
      {...props}
    >
      {loading ? (
        <>
          <Spinner />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button };
