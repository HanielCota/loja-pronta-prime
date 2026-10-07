import { hasControlCharacters } from '@/lib/text';

const INTERNAL_ORIGIN = 'http://interno.invalid';

/** "//dominio" e "/\dominio" são lidos pelo navegador como outro site. */
const isProtocolRelative = (path: string) => path.startsWith('//') || path.startsWith('/\\');

/**
 * Aceita apenas caminhos internos do próprio sistema (ex.: "/aulas?x=1").
 * Recusa URLs externas, "//dominio", barras invertidas e caracteres de controle.
 */
export function sanitizeRedirect(path: string | undefined): string | undefined {
  if (!path || !path.startsWith('/') || isProtocolRelative(path)) return undefined;
  if (path.includes('\\') || hasControlCharacters(path)) return undefined;

  try {
    const url = new URL(path, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN) return undefined;
    const normalized = `${url.pathname}${url.search}${url.hash}`;
    // A normalização resolve "." e ".." e pode criar um "//": "/.//evil.com" vira "//evil.com".
    return isProtocolRelative(normalized) ? undefined : normalized;
  } catch {
    return undefined;
  }
}
