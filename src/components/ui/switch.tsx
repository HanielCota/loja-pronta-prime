'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Chave liga/desliga no formato do iPhone. Desligada, o trilho cinza tem 3:1 contra o cartão (dá
 * pra ver que existe); ligada, fica azul. A bolinha corre pro lado: o estado não depende só da cor.
 */
function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full bg-track p-0.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid data-[state=checked]:bg-primary motion-safe:transition-colors motion-safe:duration-200 forced-colors:border forced-colors:border-[ButtonText]',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] data-[state=checked]:translate-x-5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out forced-colors:bg-[ButtonText]" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
