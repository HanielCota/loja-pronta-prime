'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  DEFAULT_DISPLAY,
  DISPLAY_KEYS,
  displayAttributes,
  displayStorage,
  parseDisplay,
  type DisplaySettings,
} from './display';

/** Aviso pra esta aba (o `storage` do navegador só chega nas outras abas). */
const CHANGE_EVENT = 'display-change';
const STORAGE_KEYS: string[] = Object.values(DISPLAY_KEYS).map(({ storage }) => storage);

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** O guardado como um texto só: o mesmo texto, a mesma resposta (o React compara assim). */
function snapshot(): string {
  try {
    return JSON.stringify(STORAGE_KEYS.map((key) => localStorage.getItem(key)));
  } catch {
    return '';
  }
}

function fromSnapshot(raw: string): DisplaySettings {
  if (!raw) return DEFAULT_DISPLAY;
  const values = JSON.parse(raw) as (string | null)[];
  return parseDisplay((key) => values[STORAGE_KEYS.indexOf(key)] ?? null);
}

function applyAttributes(settings: DisplaySettings) {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(displayAttributes(settings))) {
    if (value === null) {
      root.removeAttribute(name);
      continue;
    }
    root.setAttribute(name, value);
  }
}

/**
 * Os ajustes de leitura e como mudar. Até a página hidratar, o padrão (o que o servidor
 * desenhou); a tela em si já veio certa pelo script do head.
 */
export function useDisplay() {
  const settings = fromSnapshot(useSyncExternalStore(subscribe, snapshot, () => ''));
  const update = useCallback((change: Partial<DisplaySettings>) => {
    const next = { ...fromSnapshot(snapshot()), ...change };
    try {
      for (const [key, value] of Object.entries(displayStorage(next))) {
        if (value === null) {
          localStorage.removeItem(key);
          continue;
        }
        localStorage.setItem(key, value);
      }
    } catch {
      // Sem armazenamento: vale nesta página, até recarregar.
    }
    applyAttributes(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return { settings, update };
}

/** Mudou em outra aba: esta acompanha, como o tema. */
export function DisplaySync() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  useEffect(() => {
    if (raw !== null) applyAttributes(fromSnapshot(raw));
  }, [raw]);
  return null;
}
