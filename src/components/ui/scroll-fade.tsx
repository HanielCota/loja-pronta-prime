'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/** O esmaecido nunca passa disso (2,5rem, em px). */
const MAX_FADE = 40;

/**
 * Área que rola (a lista do menu lateral) e esmaece a borda que tem mais conteúdo escondido: a
 * de baixo enquanto há itens abaixo, a de cima depois de rolar. Avisa que tem mais mesmo onde a
 * barra de rolagem não aparece (Mac, celular). Sem nada escondido, nada esmaece. Sem JavaScript,
 * rola normal, sem o esmaecido.
 */
export function ScrollFade({ className, children, ...props }: React.ComponentProps<'div'>) {
  const ref = React.useRef<HTMLDivElement>(null);
  // Quanto esmaecer em cada borda: o que está escondido daquele lado, até 2,5rem. Assim, com só
  // um pouquinho escondido, o esmaecido é pequeno e não apaga o último item que aparece.
  const [edges, setEdges] = React.useState({ top: 0, bottom: 0 });

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      // Arredondado: o zoom do navegador deixa frações na conta.
      const top = Math.min(MAX_FADE, Math.round(element.scrollTop));
      const bottom = Math.min(
        MAX_FADE,
        Math.max(0, Math.round(element.scrollHeight - element.clientHeight - element.scrollTop)),
      );
      setEdges((previous) =>
        previous.top === top && previous.bottom === bottom ? previous : { top, bottom },
      );
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    // A altura muda ao redimensionar a janela e ao abrir ou fechar um grupo do menu.
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of Array.from(element.children)) observer.observe(child);
    return () => {
      element.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, []);

  const mask =
    edges.top > 1 || edges.bottom > 1
      ? `linear-gradient(to bottom, ${edges.top > 1 ? 'transparent' : 'black'}, black ${edges.top}px, black calc(100% - ${edges.bottom}px), ${edges.bottom > 1 ? 'transparent' : 'black'})`
      : undefined;

  return (
    <div
      ref={ref}
      className={cn('overflow-y-auto', className)}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
