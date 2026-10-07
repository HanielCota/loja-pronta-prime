'use client';

import { useState, type ComponentProps } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/*
 * Fora do componente porque cada página nova monta a moldura (e este <main>) do zero: só aqui a
 * informação sobrevive à navegação. Só é usada no navegador; no servidor nada anima.
 */
let firstPath: string | null = null;
let navigated = false;

/** Anima só depois da primeira troca de endereço dentro do app. */
function shouldAnimate(pathname: string): boolean {
  if (typeof window === 'undefined') return false;
  firstPath ??= pathname;
  if (pathname !== firstPath) navigated = true;
  return navigated;
}

/**
 * O `<main>` das molduras. Ao navegar dentro do app, o conteúdo da página nova entra subindo um
 * pouco, enquanto a barra e o menu lateral, de fora dele, ficam parados. Com "Reduzir animações",
 * só esmaece.
 *
 * No primeiro carregamento (e sem JavaScript, quando toda página é um carregamento novo) o
 * conteúdo já chega parado, sem se mexer depois de desenhado.
 */
export function PageMain({ className, ...props }: ComponentProps<'main'>) {
  const pathname = usePathname();
  const [animate] = useState(() => shouldAnimate(pathname));

  return (
    <main
      // Recomeça a cada endereço, inclusive quando só o trecho variável muda (o passo da marca).
      key={pathname}
      className={cn(
        animate && 'motion-safe:animate-page-enter motion-reduce:animate-page-fade',
        className,
      )}
      {...props}
    />
  );
}
