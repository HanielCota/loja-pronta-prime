import { sanitizeRedirect } from '../redirect';

const DEFAULT_PATH = '/';

/**
 * ÚNICO ponto que decide pra onde a aluna vai depois de entrar.
 *
 * Ainda não existe área logada. Quando existir, ligue aqui:
 * - a troca obrigatória de senha no primeiro acesso (senha temporária);
 * - o destino padrão (ex.: painel da aluna), no lugar de DEFAULT_PATH.
 *   Atenção: hoje "/" redireciona pro login, então troque DEFAULT_PATH junto.
 *
 * `requestedPath` vem da URL (?next=) e só é aceito se for um caminho interno.
 */
export function resolvePostLoginPath(requestedPath: string | undefined): string {
  return sanitizeRedirect(requestedPath) ?? DEFAULT_PATH;
}
