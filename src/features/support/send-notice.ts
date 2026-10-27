/** O parâmetro da URL que leva o aviso do envio quando a página abre sem JavaScript. */
export const SEND_NOTICE_PARAM = 'aviso_envio';

/**
 * Põe o aviso do envio na URL de destino (antes do `#` da âncora), pra a página mostrar depois do
 * redirecionamento. Sem aviso, a URL volta igual.
 */
export function withNotice(redirectTo: string, notice: string | null | undefined): string {
  if (!notice) return redirectTo;
  const [path = '', hash] = redirectTo.split('#');
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${SEND_NOTICE_PARAM}=${encodeURIComponent(notice)}${hash ? `#${hash}` : ''}`;
}
