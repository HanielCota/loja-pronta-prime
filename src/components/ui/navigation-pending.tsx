'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from './button';

/** Se a página nova nunca chegar (erro de rede), o conteúdo antigo volta a aparecer. */
const GIVE_UP_MS = 20_000;
type NavigationAttempt = { from: string; href: string };

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
  const [pendingNavigation, setPendingNavigation] = useState<NavigationAttempt | null>(null);
  const [retryNavigation, setRetryNavigation] = useState<NavigationAttempt | null>(null);
  const [shownUrl, setShownUrl] = useState(current);

  // Endereço novo: a navegação terminou (ou foi redirecionada pra outro lugar).
  if (shownUrl !== current) {
    setShownUrl(current);
    setPendingNavigation(null);
    setRetryNavigation(null);
  }

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    if (!pendingNavigation) {
      return;
    }

    const timer = setTimeout(() => {
      setRetryNavigation(pendingNavigation);
      setPendingNavigation(null);
    }, GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [pendingNavigation]);

  useEffect(() => {
    function startPending(event: MouseEvent) {
      if (!event.defaultPrevented || !(event.target instanceof Element)) {
        return;
      }

      const anchor = event.target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const target = new URL(anchor.href, window.location.href);
      // O mesmo endereço (ou só o trecho depois do #) não troca de página.
      if (
        target.origin !== window.location.origin ||
        target.pathname + target.search === window.location.pathname + window.location.search
      ) {
        return;
      }

      setRetryNavigation(null);
      setPendingNavigation({ from: currentRef.current, href: target.href });
    }
    // Registrado depois do React (que escuta no `document`): o link do Next já decidiu se navega.
    document.addEventListener('click', startPending);
    return () => document.removeEventListener('click', startPending);
  }, []);

  const pending = pendingNavigation?.from === current;
  const retryHref = retryNavigation?.from === current ? retryNavigation.href : null;
  return (
    <>
      <div className={retryHref ? 'mx-auto w-fit max-w-full px-4 pt-6' : 'sr-only'}>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-primary-soft p-5">
          <output className="text-body">
            {retryHref ? 'A página demorou para abrir. Você pode tentar de novo.' : null}
          </output>
          {retryHref ? (
            <Button asChild variant="soft" size="inline" className="px-5">
              <a href={retryHref}>Tentar abrir a página de novo</a>
            </Button>
          ) : null}
        </div>
      </div>
      {/* `contents`: o invólucro não muda o layout do conteúdo; `hidden` o esconde de todos. */}
      <div className={pending ? 'hidden' : 'contents'}>{children}</div>
      {pending ? fallback : null}
    </>
  );
}
