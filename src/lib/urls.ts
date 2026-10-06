import { sanitizeRedirect } from '@/features/auth/redirect';
import { hasControlCharacters } from './text';

/** Links de conteúdo podem abrir páginas web, mas nunca executar código ou embutir credenciais. */
export function toSafeWebUrl(value: string): string | undefined {
  if (/[ \\]/.test(value) || hasControlCharacters(value)) return undefined;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/** A mesma regra de destino para banners e ferramentas, inclusive ao publicar versões salvas. */
export function isSafeContentDestination(value: string): boolean {
  return value.startsWith('/')
    ? sanitizeRedirect(value) !== undefined
    : toSafeWebUrl(value) !== undefined;
}
