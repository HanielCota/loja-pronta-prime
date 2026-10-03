'use client';

import { useLayoutEffect, useSyncExternalStore } from 'react';
import {
  DARK_QUERY,
  parsePreference,
  resolveTheme,
  THEME_COLORS,
  THEME_STORAGE_KEY,
  type Theme,
  type ThemePreference,
} from './theme';

function storedPreference(): ThemePreference {
  try {
    return parsePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

function systemDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** A barra do navegador no celular acompanha o fundo. */
function paintBrowserBar(theme: Theme) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

/**
 * Troca o tema na hora. As transições ficam desligadas nesse instante: sem isso, cada botão e
 * cartão mudaria de cor no seu ritmo e a tela "escorreria" do claro pro escuro.
 */
function applyTheme(theme: Theme) {
  paintBrowserBar(theme);
  if (currentTheme() === theme) return;

  const root = document.documentElement;
  const pause = document.createElement('style');
  pause.textContent = '*,*::before,*::after{transition:none!important}';
  document.head.append(pause);
  root.classList.toggle('dark', theme === 'dark');
  // Força o navegador a pintar as cores novas antes de devolver as transições.
  void getComputedStyle(root).color;
  requestAnimationFrame(() => pause.remove());
}

/** Põe na tela o tema da escolha guardada (e do aparelho, no automático). */
function applyStored() {
  applyTheme(resolveTheme(storedPreference(), systemDark()));
}

/** Quem está olhando a escolha (a chave do perfil): avisados quando ela muda nesta aba. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => {
    listeners.delete(onChange);
    observer.disconnect();
  };
}

/** Guarda a escolha no aparelho e troca a tela. */
function setPreference(next: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Sem armazenamento (navegação privada): vale só até fechar a aba.
  }
  applyStored();
  for (const listener of listeners) listener();
}

/** Trocou em outra aba: esta acompanha. */
function onStorage(event: StorageEvent) {
  if (event.key !== THEME_STORAGE_KEY) return;
  applyStored();
  for (const listener of listeners) listener();
}

/**
 * Fica de olho no tema desde que a página monta. Reaplica o guardado: o script do começo já pintou
 * certo, mas quando o Next monta a página inteira no navegador (algumas telas de erro), o React
 * reescreve o `class` do html e o `dark` sumiria; e a barra do navegador ainda não existia pro
 * script. No automático, acompanha o aparelho trocando de tema (ao anoitecer, por exemplo).
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyStored();
    const media = window.matchMedia(DARK_QUERY);
    const onSystemChange = () => {
      if (storedPreference() === 'system') applyStored();
    };
    media.addEventListener('change', onSystemChange);
    window.addEventListener('storage', onStorage);
    return () => {
      media.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return null;
}

/**
 * A escolha, o tema que está na tela e como trocar. No servidor, o automático e o claro (o certo
 * chega logo depois).
 */
export function useTheme() {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribe,
    storedPreference,
    () => 'system',
  );
  const theme = useSyncExternalStore<Theme>(subscribe, currentTheme, () => 'light');
  return { preference, theme, setPreference };
}
