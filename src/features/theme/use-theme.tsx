'use client';

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { prefersReducedMotion } from '@/lib/reduced-motion';
import { parsePreference, THEME_COLORS, THEME_STORAGE_KEY, type Theme } from './theme';
import { DisplaySync } from './use-display';

/**
 * O tema do site, pelo next-themes: claro por padrão (decisão do produto: o escuro e o automático
 * são escolhas dela no perfil). Guarda a escolha no aparelho, segue o tema do aparelho quando ela
 * liga o automático (e quando ele troca, ao anoitecer), acompanha outras abas e põe a classe `dark`
 * antes da página aparecer, sem clarão. As transições ficam desligadas na troca: sem isso, cada botão e
 * cartão mudaria de cor no seu ritmo e a tela "escorreria" do claro pro escuro.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      storageKey={THEME_STORAGE_KEY}
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      // O script do tema roda no HTML do servidor. Se o React recriar a página no navegador (depois
      // de um erro de hidratação), um <script> recriado não roda e o React avisa no console: no
      // navegador ele vira um bloco de texto, como o das preferências (display-script.tsx).
      scriptProps={{ type: typeof window === 'undefined' ? undefined : 'text/plain' }}
    >
      <BrowserBarColor />
      <DisplaySync />
      {children}
    </NextThemesProvider>
  );
}

/** A barra do navegador no celular acompanha o fundo. */
function BrowserBarColor() {
  const { resolvedTheme } = useNextTheme();
  useEffect(() => {
    if (!resolvedTheme) return;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[resolvedTheme === 'dark' ? 'dark' : 'light']);
  }, [resolvedTheme]);
  return null;
}

const noSubscribe = () => () => {};

/**
 * A escolha, o tema que está na tela e como trocar. Até a página hidratar, o claro (o que o
 * servidor desenhou): ler o guardado antes disso faria o HTML não bater.
 */
export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useNextTheme();
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const shown: Theme = hydrated && resolvedTheme === 'dark' ? 'dark' : 'light';
  // A tela inteira esmaece de um tema pro outro (uma "foto" antes e outra depois), em vez de
  // piscar. Sem o recurso no navegador ou com "Reduzir animações", troca na hora, como antes.
  const setPreference = useCallback(
    (value: string) => {
      if (!document.startViewTransition || prefersReducedMotion()) {
        setTheme(value);
        return;
      }
      document.startViewTransition(() => flushSync(() => setTheme(value)));
    },
    [setTheme],
  );
  return {
    preference: hydrated ? parsePreference(theme) : 'light',
    theme: shown,
    setPreference,
  };
}
