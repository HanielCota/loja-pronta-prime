export type SllStage = 1 | 2 | 3;
export type SllStageLink = { stage: SllStage; href: string; label: string };

/** O menu acompanha os IDs e os títulos publicados pelo catálogo do Método. */
export function sllStageLinks(stages: readonly { id: string; title: string }[]): SllStageLink[] {
  return stages.slice(0, 3).map((stage, index) => ({
    stage: (index + 1) as SllStage,
    href: `/sll/metodo/etapa/${stage.id}`,
    label: `Etapa ${index + 1} — ${stage.title}`,
  }));
}

export type SllPage = {
  title: string;
  description: string;
  availability: 'section' | 'stores' | 'calculator' | 'lesson';
};

const PAGES: Record<string, SllPage> = {
  'minhas-lojas': {
    title: 'Minhas Lojas',
    description: 'Veja suas lojas e escolha como adicionar uma nova.',
    availability: 'stores',
  },
  'comece-aqui': {
    title: 'Comece aqui',
    description: 'Conheça o curso e veja por onde começar.',
    availability: 'section',
  },
  metodo: {
    title: 'SLL — Sistema Loja Lucrativa',
    description: 'Um caminho em 3 etapas para desenvolver sua loja.',
    availability: 'section',
  },
  'metodo/missao/1': {
    title: 'Etapa 1 — Sua loja no ar',
    description: 'Organize os primeiros passos para colocar sua loja no ar.',
    availability: 'lesson',
  },
  'metodo/missao/2': {
    title: 'Etapa 2 — Seu plano de 7 dias',
    description: 'Acompanhe as ações do plano quando o conteúdo estiver disponível.',
    availability: 'lesson',
  },
  'metodo/missao/3': {
    title: 'Etapa 3 — Biblioteca de Conhecimento',
    description: 'Encontre aulas por assunto quando a biblioteca estiver disponível.',
    availability: 'lesson',
  },
  recursos: {
    title: 'Ferramentas Automáticas',
    description: 'Acesse recursos de apoio para sua loja.',
    availability: 'calculator',
  },
  cursos: {
    title: 'Cursos Complementares',
    description: 'Aprofunde seus conhecimentos com aulas extras.',
    availability: 'section',
  },
};

/** Retorna o contexto da página sem presumir a etapa em aulas sem essa informação no endereço. */
export function sllPage(path: string[]): SllPage | null {
  const key = path.join('/');
  const page = PAGES[key];
  if (page) return page;

  if (path[0] === 'metodo' && path[1] === 'aula' && path[2]) {
    return {
      title: 'Aula do Método SLL',
      description: 'Esta aula ainda não está cadastrada nesta versão da Prime.',
      availability: 'lesson',
    };
  }

  return null;
}

/** Só indica uma etapa quando a rota ou a aula atual aponta para uma etapa publicada. */
export function sllStageFromPath(
  pathname: string,
  stageLinks: readonly SllStageLink[],
): SllStage | null {
  const index = stageLinks.findIndex(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );
  return index < 0 || index > 2 ? null : ((index + 1) as SllStage);
}

/** Usa a etapa da aula quando a rota dela não carrega o contexto. */
export function sllCurrentStage(
  pathname: string,
  currentSection: string | undefined,
  stageLinks: readonly SllStageLink[],
): SllStage | null {
  return (
    sllStageFromPath(pathname, stageLinks) ??
    (currentSection ? sllStageFromPath(currentSection, stageLinks) : null)
  );
}
