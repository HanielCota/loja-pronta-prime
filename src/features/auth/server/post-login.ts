import { authHref } from '../links';
import { sanitizeRedirect } from '../redirect';

const DEFAULT_PATH = '/';

/**
 * ÚNICO ponto que decide pra onde a aluna vai depois de entrar.
 *
 * - Senha temporária (`mustChangePassword`): antes de qualquer outra tela, ela cria a própria
 *   senha em /primeiro-acesso, que depois manda pro destino pedido.
 * - Sem destino pedido: o início ("/"). Hoje ele só confirma o acesso; quando a área da aluna
 *   existir, ela entra ali.
 * - `staffPanelPath`: quem é da equipe e não comprou nenhum produto entra pelo painel do cargo. O
 *   início mostraria "Seu acesso ainda não foi liberado", que é recado pra aluna, não pra equipe.
 *   Um destino pedido na URL continua valendo: o atalho é só pra quem entrou sem destino.
 *
 * `requestedPath` vem da URL (?next=) e só é aceito se for um caminho interno.
 */
export function resolvePostLoginPath(
  requestedPath: string | undefined,
  {
    mustChangePassword = false,
    staffPanelPath = null,
  }: { mustChangePassword?: boolean; staffPanelPath?: string | null } = {},
): string {
  const destination = sanitizeRedirect(requestedPath);
  if (mustChangePassword) return authHref('/primeiro-acesso', destination);
  return destination ?? staffPanelPath ?? DEFAULT_PATH;
}
