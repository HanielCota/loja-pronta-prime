/** Texto original da interface: o banco guarda somente as mudanças feitas no painel. */
export const SLL_COPY = {
  dashboardIntro: 'Continue de onde parou ou escolha uma seção do SLL.',
  dashboardEmptyIntro:
    'As aulas ainda estão em preparação. Os recursos disponíveis estão logo abaixo.',
  dashboardPathTitle: 'Seu caminho no curso',
  dashboardWelcomeTitle: 'Trilha de boas-vindas',
  dashboardWelcomeDetail: 'Assista à mensagem de boas-vindas.',
  dashboardMethodTitle: 'Método em 3 Etapas',
  dashboardMethodDetail: 'Veja as etapas do método.',
  dashboardCoursesTitle: 'Minicursos',
  dashboardCoursesDetail: 'Acesse os cursos complementares.',
  dashboardToolsTitle: 'Ferramentas',
  dashboardToolsDetail: 'Calculadoras, materiais, assistentes e parceiros recomendados.',
  dashboardToolsButton: 'Acessar Recursos',
  dashboardStoresTitle: 'Avisos da sua conta',
  dashboardStoresDetail:
    'Nenhum aviso por enquanto. Quando houver novidades sobre suas lojas, elas aparecerão aqui.',
  dashboardStoresButton: 'Ver situação das lojas',
  methodStagesTitle: 'Etapas',
  methodToolsTitle: 'Ferramentas',
  methodToolsDetail: 'Materiais e ferramentas do SLL.',
  methodToolsButton: 'Acessar ferramentas',
  stageProgressTitle: 'Progresso da etapa',
  stage2PrioritiesTitle: 'Seis prioridades',
  stage2PrioritiesIntro:
    'Uma prioridade por dia. Todos os dias estão disponíveis; avance no seu ritmo.',
  stage2OptionalTitle: 'Ações complementares',
  stage2OptionalIntro:
    'Aprofunde o que fizer sentido para sua loja. Estas ações não entram na contagem das 6 prioridades.',
  coursesTitle: 'Cursos complementares',
  coursesIntro: 'Aprofundamentos opcionais para a sua loja na Shopee.',
  coursesFeaturedTitle: 'Destaque',
  coursesLibraryTitle: 'Todos os cursos',
  resourcesTitle: 'Recursos',
  resourcesIntro: 'Ferramentas, parceiros e materiais que aceleram sua jornada.',
  sidebarPanel: 'Painel',
  sidebarStores: 'Minhas Lojas',
  sidebarWelcome: 'Comece aqui',
  sidebarMethod: 'Método SLL',
  sidebarResources: 'Recursos',
  sidebarCourses: 'Cursos complementares',
} as const;

export type SllCopyKey = keyof typeof SLL_COPY;
export type SllCopy = Record<SllCopyKey, string>;

export const SLL_COPY_GROUPS: Array<{
  title: string;
  fields: Array<{ key: SllCopyKey; label: string }>;
}> = [
  {
    title: 'Boas-vindas do painel',
    fields: [
      { key: 'dashboardIntro', label: 'Texto de boas-vindas' },
      { key: 'dashboardEmptyIntro', label: 'Texto quando ainda não há aulas' },
    ],
  },
  {
    title: 'Caminho no curso',
    fields: [
      { key: 'dashboardPathTitle', label: 'Título do caminho' },
      { key: 'dashboardWelcomeTitle', label: 'Nome das boas-vindas' },
      { key: 'dashboardWelcomeDetail', label: 'Explicação das boas-vindas' },
      { key: 'dashboardMethodTitle', label: 'Nome do método' },
      { key: 'dashboardMethodDetail', label: 'Explicação do método' },
      { key: 'dashboardCoursesTitle', label: 'Nome dos minicursos' },
      { key: 'dashboardCoursesDetail', label: 'Explicação dos minicursos' },
    ],
  },
  {
    title: 'Cartões do painel',
    fields: [
      { key: 'dashboardToolsTitle', label: 'Título das ferramentas' },
      { key: 'dashboardToolsDetail', label: 'Explicação das ferramentas' },
      { key: 'dashboardToolsButton', label: 'Botão das ferramentas' },
      { key: 'dashboardStoresTitle', label: 'Título dos avisos da conta' },
      { key: 'dashboardStoresDetail', label: 'Texto sem avisos' },
      { key: 'dashboardStoresButton', label: 'Botão das lojas' },
    ],
  },
  {
    title: 'Método e etapas',
    fields: [
      { key: 'methodStagesTitle', label: 'Título das etapas' },
      { key: 'methodToolsTitle', label: 'Título das ferramentas no método' },
      { key: 'methodToolsDetail', label: 'Texto das ferramentas no método' },
      { key: 'methodToolsButton', label: 'Botão das ferramentas no método' },
      { key: 'stageProgressTitle', label: 'Título do progresso da etapa' },
      { key: 'stage2PrioritiesTitle', label: 'Título das prioridades' },
      { key: 'stage2PrioritiesIntro', label: 'Texto das prioridades' },
      { key: 'stage2OptionalTitle', label: 'Título das ações complementares' },
      { key: 'stage2OptionalIntro', label: 'Texto das ações complementares' },
    ],
  },
  {
    title: 'Cursos complementares',
    fields: [
      { key: 'coursesTitle', label: 'Título da página' },
      { key: 'coursesIntro', label: 'Texto de apresentação' },
      { key: 'coursesFeaturedTitle', label: 'Título do destaque' },
      { key: 'coursesLibraryTitle', label: 'Título da lista de cursos' },
    ],
  },
  {
    title: 'Recursos',
    fields: [
      { key: 'resourcesTitle', label: 'Título da página' },
      { key: 'resourcesIntro', label: 'Texto de apresentação' },
    ],
  },
  {
    title: 'Menu lateral',
    fields: [
      { key: 'sidebarPanel', label: 'Painel' },
      { key: 'sidebarStores', label: 'Minhas Lojas' },
      { key: 'sidebarWelcome', label: 'Comece aqui' },
      { key: 'sidebarMethod', label: 'Método SLL' },
      { key: 'sidebarResources', label: 'Recursos' },
      { key: 'sidebarCourses', label: 'Cursos complementares' },
    ],
  },
];
