export type AdminSection =
  | 'overview'
  | 'updates'
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
  | 'tickets'
  | 'support-performance'
  | 'support-team'
  | 'support-settings';

/** O primeiro pedaço do endereço depois de `/admin` e a seção do menu que ele representa. */
const SECTION_BY_SEGMENT: Readonly<Record<string, AdminSection>> = {
  novidades: 'updates',
  online: 'online',
  contas: 'accounts',
  acessos: 'access',
  hotmart: 'hotmart',
  bling: 'bling',
  experts: 'experts',
  assistente: 'assistant',
  chamados: 'tickets',
  suporte: 'support-settings',
  textos: 'texts',
  recursos: 'resources',
  arquivados: 'archived',
  banners: 'banners',
};

const SUPPORT_SECTION_BY_SEGMENT: Readonly<Record<string, AdminSection>> = {
  desempenho: 'support-performance',
  equipe: 'support-team',
  configuracoes: 'support-settings',
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
  const [segment = '', subsegment = ''] = pathname.slice('/admin/'.length).split('/');
  // O grupo Suporte mora em /admin/suporte/<parte>; sem parte, é o endereço antigo (Configurações).
  if (segment === 'suporte' && SUPPORT_SECTION_BY_SEGMENT[subsegment])
    return SUPPORT_SECTION_BY_SEGMENT[subsegment];
  return SECTION_BY_SEGMENT[segment];
}
