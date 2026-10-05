'use client';

import { ChevronDownIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** Abaixo disso do fim da página, não há mais nada pra mostrar: a seta some. */
const NEAR_END_PX = 96;

/**
 * Seta redonda embaixo da tela avisando que a lista continua. Some quando ela chega perto do fim;
 * tocar rola um pedaço. Só pra quem vê: teclado e leitor de tela já rolam sozinhos, então fica
 * fora do Tab e da leitura. Sem JavaScript não aparece (a página rola normalmente).
 */
export function ScrollHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const left = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      setVisible(left > NEAR_END_PX);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <button
      type="button"
      aria-hidden="true"
      tabIndex={-1}
      inert={!visible}
      onClick={() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollBy({ top: window.innerHeight * 0.7, behavior: reduce ? 'auto' : 'smooth' });
      }}
      className={cn(
        // No celular, fica acima do botão preso embaixo (StickyAction).
        'fixed bottom-24 left-1/2 z-10 grid size-12 -translate-x-1/2 place-items-center rounded-full border bg-card text-foreground shadow-card transition-opacity duration-200 motion-reduce:transition-none sm:bottom-8 forced-colors:border-[ButtonText]',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <ChevronDownIcon className="size-6 motion-safe:animate-[scroll-hint_1.4s_ease-in-out_3]" />
    </button>
  );
}
