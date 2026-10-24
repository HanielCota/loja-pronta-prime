'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/** Se a página nova nunca chegar (erro de rede), o conteúdo antigo volta a aparecer. */
const GIVE_UP_MS = 20_000;

/**
 * Mostra `fallback` no lugar do conteúdo do toque num link até a página nova chegar, dentro da
 * moldura que mora no `layout.tsx` (o menu e a barra ficam parados). Faz o papel de um
 * `loading.tsx` sem o Suspense dele: com o Suspense, o servidor mandava a moldura antes da guarda
 * da página, e quem não entrou recebia 200 em vez do redirecionamento 307 (e página não
 * encontrada, 200 em vez de 404).
 *
 * Só conta os links do Next: eles cancelam o clique (`preventDefault`) pra navegar dentro do app;
 * downloads, links externos e abrir em outra aba seguem o padrão do navegador e ficam de fora.
 */
export function NavigationPending({
  fallback,
  children,
}: {
  fallback: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const current = search ? `${pathname}?${search}` : pathname;
  const currentRef = useRef(current);
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const [shownUrl, setShownUrl] = useState(current);

  // Endereço novo: a navegação terminou (ou foi redirecionada pra outro lugar).
  if (shownUrl !== current) {
    setShownUrl(current);
    setPendingFrom(null);
  }

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    if (pendingFrom === null) return;
    const timer = setTimeout(() => setPendingFrom(null), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [pendingFrom]);

  useEffect(() => {
    function startPending(event: MouseEvent) {
      if (!event.defaultPrevented) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin !== window.location.origin) return;
      // O mesmo endereço (ou só o trecho depois do #) não troca de página.
      if (target.pathname + target.search === window.location.pathname + window.location.search)
        return;
      setPendingFrom(currentRef.current);
    }
    // Registrado depois do React (que escuta no `document`): o link do Next já decidiu se navega.
    document.addEventListener('click', startPending);
    return () => document.removeEventListener('click', startPending);
  }, []);

  const pending = pendingFrom === current;
  return (
    <>
      {/* `contents`: o invólucro não muda o layout do conteúdo; `hidden` o esconde de todos. */}
      <div className={pending ? 'hidden' : 'contents'}>{children}</div>
      {pending ? fallback : null}
    </>
  );
}
