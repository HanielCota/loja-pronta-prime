'use client';

import { MoonIcon, SunIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleTheme } from './theme';
import { useTheme } from './use-theme';

/** Atalho no cabeçalho: escolhe o tema e atualiza a mesma preferência do perfil. */
export function ThemeToggleButton() {
  const { theme, setPreference } = useTheme();
  const nextTheme = toggleTheme(theme);
  const label = nextTheme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={() => setPreference(nextTheme)}
    >
      {theme === 'dark' ? (
        <MoonIcon aria-hidden="true" className="size-5" />
      ) : (
        <SunIcon aria-hidden="true" className="size-5" />
      )}
    </Button>
  );
}
