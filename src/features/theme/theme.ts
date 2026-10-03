/** Onde fica a escolha, no aparelho (como no iPhone, cada aparelho tem a sua). */
export const THEME_STORAGE_KEY = 'theme';

/** Cor da barra do navegador no celular, a mesma do fundo de cada tema. */
export const THEME_COLORS = { light: '#f5f5f7', dark: '#000000' } as const;

/** O tema na tela. */
export type Theme = keyof typeof THEME_COLORS;

/** O que ela escolheu: um tema fixo, ou seguir o aparelho ("Automático", o padrão). */
export type ThemePreference = Theme | 'system';

export const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Lê a escolha guardada. Sem nada guardado (ou sem acesso ao armazenamento), o automático. */
export function parsePreference(value: string | null | undefined): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** O tema que vale pra uma escolha, dado o tema do aparelho. */
export function resolveTheme(preference: ThemePreference, systemDark: boolean): Theme {
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}

/**
 * Roda antes da página aparecer: sem ele, quem usa o escuro veria um clarão branco a cada
 * carregamento. Mesma regra do `resolveTheme`, em JavaScript puro (vai inline no HTML). A barra do
 * navegador fica pro ThemeSync, porque a tag dela ainda não existe nessa hora.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==='dark'||(t!=='light'&&matchMedia(${JSON.stringify(DARK_QUERY)}).matches))document.documentElement.classList.add('dark')}catch(e){}`;
