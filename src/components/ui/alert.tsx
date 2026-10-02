import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Entra com fade + leve deslize; com movimento reduzido, só o fade.
const alertVariants = cva(
  "relative grid w-full animate-in gap-0.5 rounded-2xl px-4 py-3.5 text-left text-sm duration-200 fade-in-0 slide-in-from-top-1 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3 motion-reduce:slide-in-from-top-0 *:[svg]:row-span-2 *:[svg]:translate-y-px *:[svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        destructive: 'bg-destructive-soft text-foreground *:[svg]:text-destructive',
      },
    },
    defaultVariants: {
      variant: 'destructive',
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-title" className={cn('font-semibold', className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      // Cinza sobre o fundo rosa não passa no contraste (4,4:1): mesmo preto do título, sem negrito.
      className={cn('text-sm text-foreground', className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
