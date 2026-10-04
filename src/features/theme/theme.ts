/** Onde fica a escolha, no aparelho (como no iPhone, cada aparelho tem a sua). */
export const THEME_STORAGE_KEY = 'theme';

/** Cor da barra do navegador no celular, a mesma do fundo de cada tema. */
export const THEME_COLORS = { light: '#f5f5f7', dark: '#1f1f22' } as const;

/** O tema na tela. */
export type Theme = keyof typeof THEME_COLORS;

/** O que ela escolheu: um tema fixo, ou seguir o aparelho ("Automático", o padrão). */
export type ThemePreference = Theme | 'system';

/** Lê a escolha guardada. Sem nada guardado (ou com lixo), o automático. */
export function parsePreference(value: string | null | undefined): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}
