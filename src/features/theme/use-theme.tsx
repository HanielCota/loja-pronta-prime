'use client';

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
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
  return {
    preference: hydrated ? parsePreference(theme) : 'light',
    theme: shown,
    setPreference: setTheme,
  };
}
