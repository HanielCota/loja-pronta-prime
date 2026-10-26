export type AdminSection =
  | 'overview'
  | 'leads'
  | 'online'
  | 'welcome'
  | 'method'
  | 'courses'
  | 'banners'
  | 'texts'
  | 'resources'
  | 'archived'
  | 'accounts'
  | 'access'
  | 'hotmart'
  | 'bling'
  | 'experts'
  | 'assistant'
  | 'support';

/** O primeiro pedaço do endereço depois de `/admin` e a seção do menu que ele representa. */
const SECTION_BY_SEGMENT: Readonly<Record<string, AdminSection>> = {
  online: 'online',
  contas: 'accounts',
  acessos: 'access',
  hotmart: 'hotmart',
  bling: 'bling',
  experts: 'experts',
  assistente: 'assistant',
  suporte: 'support',
  textos: 'texts',
  recursos: 'resources',
  arquivados: 'archived',
  banners: 'banners',
};

const CONTENT_AREAS: ReadonlySet<string> = new Set(['welcome', 'method', 'courses']);

/**
 * A seção do menu do painel marcada como atual, a partir do endereço. A moldura mora no
 * `layout.tsx` e não recebe nada da página, então a conta sai daqui. `area` é o `?area=` da
 * inicial (as áreas do conteúdo). A prévia da aula não tem seção.
 */
export function adminSectionFor(pathname: string, area: string | null): AdminSection | undefined {
  if (pathname === '/leads' || pathname.startsWith('/leads/')) return 'leads';
  if (pathname === '/admin') {
    if (area && CONTENT_AREAS.has(area)) return area as AdminSection;
    return 'overview';
  }
  if (!pathname.startsWith('/admin/')) return undefined;
  const segment = pathname.slice('/admin/'.length).split('/')[0] ?? '';
  return SECTION_BY_SEGMENT[segment];
}
