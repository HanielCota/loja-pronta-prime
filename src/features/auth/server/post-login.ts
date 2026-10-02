import { authHref } from '../links';
import { sanitizeRedirect } from '../redirect';

const DEFAULT_PATH = '/';

/**
 * ÚNICO ponto que decide pra onde a aluna vai depois de entrar.
 *
 * - Senha temporária (`mustChangePassword`): antes de qualquer outra tela, ela cria a própria
 *   senha em /primeiro-acesso, que depois manda pro destino pedido.
 * - Ainda não existe área logada: quando existir, troque DEFAULT_PATH pelo painel da aluna.
 *   Atenção: hoje "/" redireciona pro login.
 *
 * `requestedPath` vem da URL (?next=) e só é aceito se for um caminho interno.
 */
export function resolvePostLoginPath(
  requestedPath: string | undefined,
  { mustChangePassword = false }: { mustChangePassword?: boolean } = {},
): string {
  const destination = sanitizeRedirect(requestedPath);
  if (mustChangePassword) return authHref('/primeiro-acesso', destination);
  return destination ?? DEFAULT_PATH;
}
