import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

// Resposta no instante do toque (active), não só ao soltar: encolhe levemente em 100ms.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          'rounded-full bg-primary text-body font-semibold text-primary-foreground transition-[background-color,transform] duration-100 ease-out hover:bg-primary-hover active:scale-[0.97] motion-reduce:active:scale-100',
        ghost:
          'rounded-full text-muted-foreground transition-[background-color,color,opacity] duration-100 hover:bg-muted hover:text-foreground active:opacity-60',
        link: 'rounded-md font-medium text-link underline-offset-4 transition-opacity duration-100 hover:underline active:opacity-60',
      },
      size: {
        default: 'h-12 w-full px-6',
        icon: 'size-11',
        /** Link de texto com alvo de toque de 44px. */
        inline: 'h-auto min-h-11 px-0',
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
      disabled={disabled || loading}
      aria-busy={loading || undefined}
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
